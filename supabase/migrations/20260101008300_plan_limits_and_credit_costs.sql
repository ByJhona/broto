create or replace function public.consume_credit(credit_reason text default 'identification') returns integer
  language plpgsql security definer
  set search_path to 'public'
as $$
declare
  v_monthly_credits integer;
  v_balance integer;
  v_cost integer;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));

  v_cost := case credit_reason
    when 'identification' then 2
    when 'diagnosis' then 5
    when 'growth_check' then 3
    when 'chat_question' then 1
    when 'boost_content' then 20
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

alter table public.plans add column max_active_listings integer;
alter table public.plans add column max_events_per_month integer;
alter table public.plans add column max_listing_photos integer;

update public.plans set
  monthly_credits = 15,
  max_active_listings = 3,
  max_events_per_month = 1,
  max_listing_photos = 3,
  description = '15 créditos por semana para identificar, diagnosticar e cuidar das suas plantas · até 3 anúncios ativos e 1 evento por mês'
where id = 'free';

update public.plans set
  monthly_credits = 40,
  max_active_listings = null,
  max_events_per_month = null,
  max_listing_photos = 8,
  description = '40 créditos por semana para identificar, diagnosticar e cuidar das suas plantas · anúncios e eventos ilimitados'
where id = 'premium';

drop function public.get_my_credits();

create function public.get_my_credits() returns table(
  plan_id text,
  plan_name text,
  monthly_credits integer,
  balance integer,
  credit_renewal_period text,
  max_active_listings integer,
  max_events_per_month integer,
  max_listing_photos integer
)
  language sql stable security definer
  set search_path to 'public'
as $$
  select p.id, p.name, p.monthly_credits,
    case when p.monthly_credits is null then null
         else public.get_credit_balance(auth.uid())
    end as balance,
    p.credit_renewal_period,
    p.max_active_listings,
    p.max_events_per_month,
    p.max_listing_photos
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.user_id = auth.uid();
$$;

grant all on function public.get_my_credits() to anon;
grant all on function public.get_my_credits() to authenticated;
grant all on function public.get_my_credits() to service_role;

create function public.check_listing_limit() returns trigger
  language plpgsql security definer
  set search_path to 'public'
as $$
declare
  v_max integer;
  v_active_count integer;
begin
  select p.max_active_listings into v_max
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.user_id = new.user_id;

  if v_max is null then
    return new;
  end if;

  select count(*) into v_active_count
  from public.plant_listings
  where user_id = new.user_id and status = 'available' and deleted_at is null;

  if v_active_count >= v_max then
    raise exception 'listing_limit_reached';
  end if;

  return new;
end;
$$;

create trigger check_listing_limit_before_insert
  before insert on public.plant_listings
  for each row execute function public.check_listing_limit();

create function public.check_event_limit() returns trigger
  language plpgsql security definer
  set search_path to 'public'
as $$
declare
  v_max integer;
  v_count integer;
begin
  select p.max_events_per_month into v_max
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.user_id = new.user_id;

  if v_max is null then
    return new;
  end if;

  select count(*) into v_count
  from public.events
  where user_id = new.user_id
    and deleted_at is null
    and created_at >= date_trunc('month', now());

  if v_count >= v_max then
    raise exception 'event_limit_reached';
  end if;

  return new;
end;
$$;

create trigger check_event_limit_before_insert
  before insert on public.events
  for each row execute function public.check_event_limit();
