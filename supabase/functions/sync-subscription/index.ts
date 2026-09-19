import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getAuthenticatedUser } from '../_shared/auth.ts';
import { applySubscriptionState, resetToFreePlan } from '../_shared/revenuecat.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const REVENUECAT_SECRET_API_KEY = Deno.env.get('REVENUECAT_SECRET_API_KEY')!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const NON_SUBSCRIPTION_GRACE_PERIOD_MS = 2 * 60 * 1000;

type RevenueCatSubscription = {
  product_identifier: string;
  expires_date: string | null;
  unsubscribe_detected_at: string | null;
};

type RevenueCatNonSubscriptionPurchase = {
  store_transaction_id: string;
  purchase_date: string;
};

type RevenueCatSubscriberResponse = {
  subscriber: {
    subscriptions: Record<string, RevenueCatSubscription>;
    non_subscriptions: Record<string, RevenueCatNonSubscriptionPurchase[]>;
  };
};

function isActive(subscription: RevenueCatSubscription): boolean {
  return !subscription.expires_date || new Date(subscription.expires_date).getTime() > Date.now();
}

function pickMostRecent(a: RevenueCatSubscription, b: RevenueCatSubscription): RevenueCatSubscription {
  if (!a.expires_date) return a;
  if (!b.expires_date) return b;
  return new Date(b.expires_date) > new Date(a.expires_date) ? b : a;
}

function findActiveSubscription(subscriptions: Record<string, RevenueCatSubscription>): RevenueCatSubscription | null {
  const active = Object.values(subscriptions).filter(isActive);
  if (active.length === 0) return null;
  return active.reduce(pickMostRecent);
}

async function grantMissingNonSubscriptionPurchases(
  userId: string,
  nonSubscriptions: Record<string, RevenueCatNonSubscriptionPurchase[]>
): Promise<void> {
  for (const [productId, purchases] of Object.entries(nonSubscriptions)) {
    for (const purchase of purchases) {
      const purchaseAgeMs = Date.now() - new Date(purchase.purchase_date).getTime();
      if (purchaseAgeMs < NON_SUBSCRIPTION_GRACE_PERIOD_MS) continue;

      const { error: dedupError } = await supabaseAdmin
        .from('revenuecat_processed_events')
        .insert({ event_id: `sync:${purchase.store_transaction_id}`, transaction_id: purchase.store_transaction_id });

      if (dedupError) {
        if (dedupError.code !== '23505') {
          console.error('Erro registrando compra avulsa processada:', dedupError);
        }
        continue;
      }

      const { data: pack } = await supabaseAdmin
        .from('credit_packs')
        .select('credits')
        .eq('id', productId)
        .maybeSingle();

      if (!pack) continue;

      await supabaseAdmin.rpc('grant_credits', {
        target_user_id: userId,
        credit_amount: pack.credits,
        grant_reason: 'purchase',
      });
    }
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const auth = await getAuthenticatedUser(req);
  if (!auth) {
    return new Response('Unauthorized', { status: 401 });
  }

  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${auth.user.id}`, {
    headers: { Authorization: `Bearer ${REVENUECAT_SECRET_API_KEY}` },
  });

  if (!response.ok) {
    console.error('Erro consultando o RevenueCat:', response.status, await response.text());
    return new Response('Não foi possível consultar a assinatura', { status: 502 });
  }

  const body = (await response.json()) as RevenueCatSubscriberResponse;
  const activeSubscription = findActiveSubscription(body.subscriber.subscriptions ?? {});

  try {
    if (activeSubscription) {
      await applySubscriptionState(supabaseAdmin, {
        userId: auth.user.id,
        productId: activeSubscription.product_identifier,
        expiresAtMs: activeSubscription.expires_date ? new Date(activeSubscription.expires_date).getTime() : null,
        grantCredits: true,
        status: activeSubscription.unsubscribe_detected_at ? 'canceled' : 'active',
      });
    } else {
      await resetToFreePlan(supabaseAdmin, auth.user.id);
    }

    await grantMissingNonSubscriptionPurchases(auth.user.id, body.subscriber.non_subscriptions ?? {});
  } catch (error) {
    console.error('Erro sincronizando assinatura com o RevenueCat:', error);
    return new Response('Internal error', { status: 500 });
  }

  return new Response('OK', { status: 200 });
});
