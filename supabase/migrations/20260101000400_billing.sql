create table public.plans (
  id text primary key,
  name text not null,
  description text not null,
  price_cents integer not null default 0,
  monthly_credits integer,
  revenuecat_entitlement_id text,
  sort_order integer not null default 0,
  credit_renewal_period text not null default 'monthly'
    check (credit_renewal_period in ('weekly', 'monthly'))
);

alter table public.plans enable row level security;

create policy "Anyone can view plans"
  on public.plans for select
  using (true);

insert into public.plans (id, name, description, price_cents, monthly_credits, revenuecat_entitlement_id, sort_order, credit_renewal_period) values
  ('free', 'Plano Gratuito', '5 créditos de identificação por semana', 0, 5, null, 1, 'weekly'),
  ('premium', 'Plano Premium', '20 créditos de identificação por semana e acompanhamento avançado das plantas', 1990, 20, 'broto_pro', 2, 'weekly');

create table public.credit_packs (
  id text primary key,
  name text not null,
  credits integer not null check (credits > 0),
  price_cents integer not null default 0,
  sort_order integer not null default 0
);

alter table public.credit_packs enable row level security;

create policy "Anyone can view credit packs"
  on public.credit_packs for select
  using (true);

insert into public.credit_packs (id, name, credits, price_cents, sort_order) values
  ('credits_10', '10 créditos avulsos', 10, 990, 1),
  ('credits_30', '30 créditos avulsos', 30, 2490, 2);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  plan_id text not null default 'free' references public.plans (id),
  status text not null default 'active'
    check (status in ('active', 'trialing', 'canceled', 'expired', 'past_due')),
  provider text,
  provider_customer_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "Users can view their own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row
  execute function public.set_updated_at();

create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount integer not null,
  reason text not null check (reason in ('monthly_grant', 'weekly_grant', 'identification', 'diagnosis', 'growth_check', 'purchase', 'adjustment')),
  created_at timestamptz not null default now()
);

alter table public.credit_ledger enable row level security;

create policy "Users can view their own credit ledger"
  on public.credit_ledger for select
  using (auth.uid() = user_id);

create index credit_ledger_user_id_idx on public.credit_ledger (user_id);

create function public.get_credit_balance(target_user_id uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(sum(amount), 0)::integer
  from public.credit_ledger
  where user_id = target_user_id;
$$;

revoke all on function public.get_credit_balance(uuid) from public, anon, authenticated;

create function public.get_my_credits()
returns table (
  plan_id text,
  plan_name text,
  monthly_credits integer,
  balance integer,
  credit_renewal_period text
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.name, p.monthly_credits,
    case when p.monthly_credits is null then null
         else public.get_credit_balance(auth.uid())
    end as balance,
    p.credit_renewal_period
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.user_id = auth.uid();
$$;

create function public.consume_credit(credit_reason text default 'identification')
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

  select public.get_credit_balance(auth.uid()) into v_balance;

  if v_balance < v_cost then
    raise exception 'insufficient_credits';
  end if;

  insert into public.credit_ledger (user_id, amount, reason)
  values (auth.uid(), -v_cost, credit_reason);

  return public.get_credit_balance(auth.uid());
end;
$$;

create function public.grant_credits(target_user_id uuid, credit_amount integer, grant_reason text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if credit_amount <= 0 then
    raise exception 'credit_amount must be positive';
  end if;

  insert into public.credit_ledger (user_id, amount, reason)
  values (target_user_id, credit_amount, grant_reason);

  return public.get_credit_balance(target_user_id);
end;
$$;

revoke all on function public.grant_credits(uuid, integer, text) from public, anon, authenticated;

create function public.reset_credits_to_plan(target_user_id uuid, target_balance integer, grant_reason text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_diff integer;
begin
  v_diff := target_balance - public.get_credit_balance(target_user_id);

  if v_diff != 0 then
    insert into public.credit_ledger (user_id, amount, reason)
    values (target_user_id, v_diff, grant_reason);
  end if;

  return public.get_credit_balance(target_user_id);
end;
$$;

revoke all on function public.reset_credits_to_plan(uuid, integer, text) from public, anon, authenticated;

create function public.reset_weekly_plan_credits()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  for v_row in
    select s.user_id, p.monthly_credits as target_balance
    from public.subscriptions s
    join public.plans p on p.id = s.plan_id
    where p.credit_renewal_period = 'weekly'
      and s.status = 'active'
      and p.monthly_credits is not null
  loop
    perform public.reset_credits_to_plan(v_row.user_id, v_row.target_balance, 'weekly_grant');
  end loop;
end;
$$;

revoke all on function public.reset_weekly_plan_credits() from public, anon, authenticated;

select cron.schedule(
  'reset_weekly_plan_credits',
  '0 0 * * 1',
  $$select public.reset_weekly_plan_credits();$$
);

create function public.handle_new_user_subscription()
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

create trigger on_auth_user_created_subscription
  after insert on auth.users
  for each row
  execute function public.handle_new_user_subscription();

create table public.revenuecat_processed_events (
  event_id text primary key,
  processed_at timestamptz not null default now()
);

alter table public.revenuecat_processed_events enable row level security;
