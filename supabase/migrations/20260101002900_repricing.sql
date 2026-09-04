update public.plans
set name = 'Broto+',
    price_cents = 990,
    description = '20 créditos por semana para identificar, diagnosticar e cuidar das suas plantas'
where id = 'premium';

update public.plans
set description = '5 créditos por semana para identificar, diagnosticar e cuidar das suas plantas'
where id = 'free';

update public.credit_packs
set price_cents = 490
where id = 'credits_10';

update public.credit_packs
set id = 'credits_25', name = '25 créditos avulsos', credits = 25, price_cents = 990
where id = 'credits_30';

insert into public.credit_packs (id, name, credits, price_cents, sort_order)
values ('credits_60', '60 créditos avulsos', 60, 1990, 3);

create or replace function public.consume_credit(credit_reason text default 'identification')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_monthly_credits integer;
  v_balance integer;
  v_cost integer;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  v_cost := case credit_reason
    when 'identification' then 2
    when 'diagnosis' then 4
    when 'growth_check' then 1
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

  select public.get_credit_balance(auth.uid()) into v_balance;

  if v_balance < v_cost then
    raise exception 'insufficient_credits';
  end if;

  insert into public.credit_ledger (user_id, amount, reason)
  values (auth.uid(), -v_cost, credit_reason);

  return public.get_credit_balance(auth.uid());
end;
$$;
