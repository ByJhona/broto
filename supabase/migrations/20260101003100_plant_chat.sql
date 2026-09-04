create table public.plant_chat_messages (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.plant_chat_messages enable row level security;

create policy "Users can view their own plant chat messages"
  on public.plant_chat_messages for select
  using (auth.uid() = user_id);

create policy "Users can insert their own plant chat messages"
  on public.plant_chat_messages for insert
  with check (auth.uid() = user_id);

create index plant_chat_messages_plant_id_idx on public.plant_chat_messages (plant_id, created_at);

alter table public.credit_ledger drop constraint if exists credit_ledger_reason_check;
alter table public.credit_ledger add constraint credit_ledger_reason_check
  check (reason in (
    'monthly_grant', 'weekly_grant', 'identification', 'diagnosis', 'growth_check',
    'chat_question', 'purchase', 'adjustment'
  ));

create or replace function public.get_plan_credit_balance(target_user_id uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select greatest(0, coalesce(sum(amount), 0))::integer
  from public.credit_ledger
  where user_id = target_user_id
    and reason in ('monthly_grant', 'weekly_grant', 'identification', 'diagnosis', 'growth_check', 'chat_question');
$$;

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
    when 'chat_question' then 1
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
