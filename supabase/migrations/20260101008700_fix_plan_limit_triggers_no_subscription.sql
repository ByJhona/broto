create or replace function public.check_listing_limit() returns trigger
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

  if not found then
    raise exception 'no_subscription';
  end if;

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

create or replace function public.check_event_limit() returns trigger
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

  if not found then
    raise exception 'no_subscription';
  end if;

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
