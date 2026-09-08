create or replace function public.handle_new_user_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_free_credits integer;
begin
  insert into public.subscriptions (user_id, plan_id, status)
  values (new.id, 'free', 'active');

  select monthly_credits into v_free_credits from public.plans where id = 'free';

  insert into public.credit_ledger (user_id, amount, reason)
  values (new.id, v_free_credits, 'monthly_grant');

  return new;
end;
$$;
