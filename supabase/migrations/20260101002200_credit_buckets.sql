alter table public.credit_ledger
  add column bucket text not null default 'plan' check (bucket in ('plan', 'purchased'));

update public.credit_ledger
set bucket = 'purchased'
where reason = 'purchase';

create function public.get_plan_credit_balance(target_user_id uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(sum(amount), 0)::integer
  from public.credit_ledger
  where user_id = target_user_id and bucket = 'plan';
$$;

revoke all on function public.get_plan_credit_balance(uuid) from public, anon, authenticated;

create or replace function public.consume_credit(credit_reason text default 'identification')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_monthly_credits integer;
  v_total_balance integer;
  v_plan_balance integer;
  v_cost integer;
  v_plan_spend integer;
  v_purchased_spend integer;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  v_cost := case credit_reason
    when 'identification' then 1
    when 'diagnosis' then 4
    when 'growth_check' then 4
    else null
  end;

  if v_cost is null then
    raise exception 'invalid_credit_reason';
  end if;

  select p.monthly_credits into v_monthly_credits
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.user_id = auth.uid();

  if not found then
    raise exception 'no_subscription';
  end if;

  if v_monthly_credits is null then
    return null;
  end if;

  select public.get_credit_balance(auth.uid()) into v_total_balance;

  if v_total_balance < v_cost then
    raise exception 'insufficient_credits';
  end if;

  select public.get_plan_credit_balance(auth.uid()) into v_plan_balance;

  v_plan_spend := least(greatest(v_plan_balance, 0), v_cost);
  v_purchased_spend := v_cost - v_plan_spend;

  if v_plan_spend > 0 then
    insert into public.credit_ledger (user_id, amount, reason, bucket)
    values (auth.uid(), -v_plan_spend, credit_reason, 'plan');
  end if;

  if v_purchased_spend > 0 then
    insert into public.credit_ledger (user_id, amount, reason, bucket)
    values (auth.uid(), -v_purchased_spend, credit_reason, 'purchased');
  end if;

  return public.get_credit_balance(auth.uid());
end;
$$;

create or replace function public.grant_credits(target_user_id uuid, credit_amount integer, grant_reason text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bucket text;
begin
  if credit_amount <= 0 then
    raise exception 'credit_amount must be positive';
  end if;

  v_bucket := case when grant_reason = 'purchase' then 'purchased' else 'plan' end;

  insert into public.credit_ledger (user_id, amount, reason, bucket)
  values (target_user_id, credit_amount, grant_reason, v_bucket);

  return public.get_credit_balance(target_user_id);
end;
$$;

revoke all on function public.grant_credits(uuid, integer, text) from public, anon, authenticated;

create or replace function public.reset_credits_to_plan(target_user_id uuid, target_balance integer, grant_reason text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_diff integer;
begin
  v_diff := target_balance - public.get_plan_credit_balance(target_user_id);

  if v_diff != 0 then
    insert into public.credit_ledger (user_id, amount, reason, bucket)
    values (target_user_id, v_diff, grant_reason, 'plan');
  end if;

  return public.get_credit_balance(target_user_id);
end;
$$;

revoke all on function public.reset_credits_to_plan(uuid, integer, text) from public, anon, authenticated;

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

  insert into public.credit_ledger (user_id, amount, reason, bucket)
  values (new.id, v_free_credits, 'monthly_grant', 'plan');

  return new;
end;
$$;
