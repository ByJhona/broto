import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const NON_SUBSCRIPTION_GRACE_PERIOD_MS = 2 * 60 * 1000;

type RevenueCatEntitlement = {
  expires_date: string | null;
  grace_period_expires_date: string | null;
  product_identifier: string;
};

type RevenueCatSubscription = {
  unsubscribe_detected_at: string | null;
};

type RevenueCatNonSubscriptionPurchase = {
  store_transaction_id: string;
  purchase_date: string;
};

type RevenueCatSubscriberResponse = {
  subscriber: {
    entitlements: Record<string, RevenueCatEntitlement>;
    subscriptions: Record<string, RevenueCatSubscription>;
    non_subscriptions: Record<string, RevenueCatNonSubscriptionPurchase[]>;
  };
};

function baseProductId(productIdentifier: string): string {
  return productIdentifier.split(':')[0];
}

function isEntitlementActive(entitlement: RevenueCatEntitlement): boolean {
  const now = Date.now();
  if (!entitlement.expires_date || new Date(entitlement.expires_date).getTime() > now) return true;
  return !!entitlement.grace_period_expires_date && new Date(entitlement.grace_period_expires_date).getTime() > now;
}

async function findActiveEntitlement(
  supabaseAdmin: SupabaseClient,
  entitlements: Record<string, RevenueCatEntitlement>
): Promise<RevenueCatEntitlement | null> {
  const { data: plans } = await supabaseAdmin
    .from('plans')
    .select('revenuecat_entitlement_id')
    .not('revenuecat_entitlement_id', 'is', null);

  const entitlementIds = new Set((plans ?? []).map((plan) => plan.revenuecat_entitlement_id as string));

  for (const id of entitlementIds) {
    const entitlement = entitlements[id];
    if (entitlement && isEntitlementActive(entitlement)) return entitlement;
  }
  return null;
}

async function applyActiveEntitlement(
  supabaseAdmin: SupabaseClient,
  userId: string,
  entitlement: RevenueCatEntitlement,
  subscriptions: Record<string, RevenueCatSubscription>
): Promise<void> {
  const productId = baseProductId(entitlement.product_identifier);
  const subscription = subscriptions[entitlement.product_identifier] ?? subscriptions[productId];

  const { data: plan, error: planError } = await supabaseAdmin
    .from('plans')
    .select('id, monthly_credits')
    .eq('id', productId)
    .maybeSingle();

  if (planError) throw planError;

  if (!plan) {
    console.warn('Nenhum plano corresponde ao produto:', entitlement.product_identifier);
    return;
  }

  await supabaseAdmin.from('subscriptions').upsert(
    {
      user_id: userId,
      plan_id: plan.id,
      status: subscription?.unsubscribe_detected_at ? 'canceled' : 'active',
      provider: 'revenuecat',
      provider_customer_id: userId,
      current_period_end: entitlement.expires_date,
    },
    { onConflict: 'user_id' }
  );

  if (plan.monthly_credits != null) {
    await supabaseAdmin.rpc('reset_credits_to_plan', {
      target_user_id: userId,
      target_balance: plan.monthly_credits,
      grant_reason: 'monthly_grant',
    });
  }
}

async function resetToFreePlan(supabaseAdmin: SupabaseClient, userId: string): Promise<void> {
  await supabaseAdmin
    .from('subscriptions')
    .update({ plan_id: 'free', status: 'active', provider_customer_id: userId })
    .eq('user_id', userId);
}

async function grantMissingNonSubscriptionPurchases(
  supabaseAdmin: SupabaseClient,
  userId: string,
  nonSubscriptions: Record<string, RevenueCatNonSubscriptionPurchase[]>
): Promise<void> {
  for (const [productId, purchases] of Object.entries(nonSubscriptions)) {
    for (const purchase of purchases) {
      const purchaseAgeMs = Date.now() - new Date(purchase.purchase_date).getTime();
      if (purchaseAgeMs < NON_SUBSCRIPTION_GRACE_PERIOD_MS) continue;

      const { data: pack } = await supabaseAdmin
        .from('credit_packs')
        .select('credits')
        .eq('id', productId)
        .maybeSingle();

      if (!pack) {
        console.error('Compra avulsa sem pacote correspondente no catálogo:', userId, productId, purchase.store_transaction_id);
        continue;
      }

      const { error: dedupError } = await supabaseAdmin
        .from('revenuecat_processed_events')
        .insert({ event_id: `sync:${purchase.store_transaction_id}`, transaction_id: purchase.store_transaction_id });

      if (dedupError) {
        if (dedupError.code !== '23505') {
          console.error('Erro registrando compra avulsa processada:', dedupError);
        }
        continue;
      }

      await supabaseAdmin.rpc('grant_credits', {
        target_user_id: userId,
        credit_amount: pack.credits,
        grant_reason: 'purchase',
      });
    }
  }
}

export async function syncSubscriberFromRevenueCat(
  supabaseAdmin: SupabaseClient,
  userId: string,
  revenueCatSecretKey: string
): Promise<void> {
  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${userId}`, {
    headers: { Authorization: `Bearer ${revenueCatSecretKey}` },
  });

  if (!response.ok) {
    throw new Error(`RevenueCat respondeu ${response.status}: ${await response.text()}`);
  }

  const body = (await response.json()) as RevenueCatSubscriberResponse;
  const activeEntitlement = await findActiveEntitlement(supabaseAdmin, body.subscriber.entitlements ?? {});

  if (activeEntitlement) {
    await applyActiveEntitlement(supabaseAdmin, userId, activeEntitlement, body.subscriber.subscriptions ?? {});
  } else {
    await resetToFreePlan(supabaseAdmin, userId);
  }

  await grantMissingNonSubscriptionPurchases(supabaseAdmin, userId, body.subscriber.non_subscriptions ?? {});
}
