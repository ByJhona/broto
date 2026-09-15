alter table public.posts add column boosted_until timestamptz;
alter table public.plant_listings add column boosted_until timestamptz;
alter table public.events add column boosted_until timestamptz;

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
    when 'diagnosis' then 4
    when 'growth_check' then 2
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

create function public.boost_content(p_content_type text, p_content_id uuid) returns timestamptz
  language plpgsql security definer
  set search_path to 'public'
as $$
declare
  v_owner_id uuid;
  v_boosted_until timestamptz;
begin
  if p_content_type not in ('post', 'listing', 'event') then
    raise exception 'invalid_content_type';
  end if;

  if p_content_type = 'post' then
    select user_id into v_owner_id from public.posts where id = p_content_id and deleted_at is null;
  elsif p_content_type = 'listing' then
    select user_id into v_owner_id from public.plant_listings where id = p_content_id and deleted_at is null;
  else
    select user_id into v_owner_id from public.events where id = p_content_id and deleted_at is null;
  end if;

  if v_owner_id is null then
    raise exception 'content_not_found';
  end if;

  if v_owner_id <> auth.uid() then
    raise exception 'not_owner';
  end if;

  perform public.consume_credit('boost_content');

  v_boosted_until := now() + interval '48 hours';

  if p_content_type = 'post' then
    update public.posts set boosted_until = v_boosted_until where id = p_content_id;
  elsif p_content_type = 'listing' then
    update public.plant_listings set boosted_until = v_boosted_until where id = p_content_id;
  else
    update public.events set boosted_until = v_boosted_until where id = p_content_id;
  end if;

  return v_boosted_until;
end;
$$;

grant execute on function public.boost_content(text, uuid) to authenticated;
