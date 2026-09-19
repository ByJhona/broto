import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

type ApplySubscriptionStateParams = {
  userId: string;
  productId: string;
  expiresAtMs: number | null;
  grantCredits: boolean;
  status: 'active' | 'canceled';
};

export async function applySubscriptionState(
  supabaseAdmin: SupabaseClient,
  params: ApplySubscriptionStateParams
): Promise<void> {
  const { data: plan, error: planError } = await supabaseAdmin
    .from('plans')
    .select('id, monthly_credits')
    .eq('id', params.productId)
    .maybeSingle();

  if (planError) throw planError;

  if (!plan) {
    console.warn('Nenhum plano corresponde ao produto:', params.productId);
    return;
  }

  const currentPeriodEnd = params.expiresAtMs ? new Date(params.expiresAtMs).toISOString() : null;

  await supabaseAdmin.from('subscriptions').upsert(
    {
      user_id: params.userId,
      plan_id: plan.id,
      status: params.status,
      provider: 'revenuecat',
      provider_customer_id: params.userId,
      current_period_end: currentPeriodEnd,
    },
    { onConflict: 'user_id' }
  );

  if (plan.monthly_credits != null && params.grantCredits) {
    await supabaseAdmin.rpc('reset_credits_to_plan', {
      target_user_id: params.userId,
      target_balance: plan.monthly_credits,
      grant_reason: 'monthly_grant',
    });
  }
}

export async function resetToFreePlan(supabaseAdmin: SupabaseClient, userId: string): Promise<void> {
  await supabaseAdmin
    .from('subscriptions')
    .update({ plan_id: 'free', status: 'active', provider_customer_id: userId })
    .eq('user_id', userId);
}
