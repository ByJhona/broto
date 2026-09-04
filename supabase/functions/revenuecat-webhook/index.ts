import { createClient } from 'jsr:@supabase/supabase-js@2';

type RevenueCatEvent = {
  id: string;
  type: string;
  app_user_id: string;
  product_id?: string;
  entitlement_ids?: string[];
  expiration_at_ms?: number;
  store?: string;
};

type WebhookBody = {
  api_version: string;
  event: RevenueCatEvent;
};

const SUBSCRIPTION_EVENTS = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION']);

const IMMEDIATE_GRANT_EVENTS = new Set(['INITIAL_PURCHASE', 'PRODUCT_CHANGE', 'UNCANCELLATION']);

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

async function handleSubscriptionEvent(event: RevenueCatEvent) {
  const entitlementIds = event.entitlement_ids ?? [];
  if (entitlementIds.length === 0) return;

  const { data: plan, error: planError } = await supabaseAdmin
    .from('plans')
    .select('id, monthly_credits')
    .in('revenuecat_entitlement_id', entitlementIds)
    .maybeSingle();

  if (planError) throw planError;

  if (!plan) {
    console.warn('Nenhum plano corresponde aos entitlements:', entitlementIds);
    return;
  }

  const currentPeriodEnd = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;

  await supabaseAdmin.from('subscriptions').upsert(
    {
      user_id: event.app_user_id,
      plan_id: plan.id,
      status: 'active',
      provider: 'revenuecat',
      provider_customer_id: event.app_user_id,
      current_period_end: currentPeriodEnd,
    },
    { onConflict: 'user_id' }
  );

  if (plan.monthly_credits != null && IMMEDIATE_GRANT_EVENTS.has(event.type)) {
    await supabaseAdmin.rpc('reset_credits_to_plan', {
      target_user_id: event.app_user_id,
      target_balance: plan.monthly_credits,
      grant_reason: 'monthly_grant',
    });
  }
}

async function handleExpirationEvent(event: RevenueCatEvent) {
  await supabaseAdmin
    .from('subscriptions')
    .update({ plan_id: 'free', status: 'active', provider_customer_id: event.app_user_id })
    .eq('user_id', event.app_user_id);
}

async function handleCancellationEvent(event: RevenueCatEvent) {
  await supabaseAdmin.from('subscriptions').update({ status: 'canceled' }).eq('user_id', event.app_user_id);
}

async function handleBillingIssueEvent(event: RevenueCatEvent) {
  await supabaseAdmin.from('subscriptions').update({ status: 'past_due' }).eq('user_id', event.app_user_id);
}

async function handleNonRenewingPurchase(event: RevenueCatEvent) {
  if (!event.product_id) return;

  const { data: pack } = await supabaseAdmin
    .from('credit_packs')
    .select('credits')
    .eq('id', event.product_id)
    .maybeSingle();

  if (!pack) {
    console.warn('Nenhum pacote de créditos corresponde ao produto:', event.product_id);
    return;
  }

  await supabaseAdmin.rpc('grant_credits', {
    target_user_id: event.app_user_id,
    credit_amount: pack.credits,
    grant_reason: 'purchase',
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const expectedAuth = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  const receivedAuth = req.headers.get('Authorization');

  if (!expectedAuth || receivedAuth !== expectedAuth) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body: WebhookBody;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const event = body.event;
  if (!event?.app_user_id || !event.type) {
    return new Response('Missing event fields', { status: 400 });
  }

  if (event.id) {
    const { error: dedupError } = await supabaseAdmin
      .from('revenuecat_processed_events')
      .insert({ event_id: event.id });

    if (dedupError) {
      if (dedupError.code === '23505') {
        return new Response('OK', { status: 200 });
      }
      console.error('Erro registrando evento do RevenueCat:', dedupError);
      return new Response('Internal error', { status: 500 });
    }
  }

  try {
    if (SUBSCRIPTION_EVENTS.has(event.type)) {
      await handleSubscriptionEvent(event);
    } else if (event.type === 'EXPIRATION') {
      await handleExpirationEvent(event);
    } else if (event.type === 'CANCELLATION') {
      await handleCancellationEvent(event);
    } else if (event.type === 'BILLING_ISSUE') {
      await handleBillingIssueEvent(event);
    } else if (event.type === 'NON_RENEWING_PURCHASE') {
      await handleNonRenewingPurchase(event);
    }
  } catch (error) {
    console.error('Erro processando evento do RevenueCat:', error);
    if (event.id) {
      await supabaseAdmin.from('revenuecat_processed_events').delete().eq('event_id', event.id);
    }
    return new Response('Internal error', { status: 500 });
  }

  return new Response('OK', { status: 200 });
});
