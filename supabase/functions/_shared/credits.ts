import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export async function hasEnoughCredits(
  supabaseAdmin: SupabaseClient,
  userId: string,
  cost: number
): Promise<boolean> {
  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('plan_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!subscription) return false;

  const { data: plan, error: planError } = await supabaseAdmin
    .from('plans')
    .select('monthly_credits')
    .eq('id', subscription.plan_id)
    .maybeSingle();

  if (planError || !plan) return false;
  if (plan.monthly_credits == null) return true;

  const { data: balance } = await supabaseAdmin.rpc('get_credit_balance', { target_user_id: userId });
  return (balance ?? 0) >= cost;
}

export function insufficientCreditsResponse(): Response {
  return new Response(JSON.stringify({ error: 'insufficient_credits' }), {
    status: 402,
    headers: { 'Content-Type': 'application/json' },
  });
}
