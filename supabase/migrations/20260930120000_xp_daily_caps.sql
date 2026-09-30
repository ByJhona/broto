ALTER TABLE public.xp_ledger
  DROP CONSTRAINT xp_ledger_reason_check;

ALTER TABLE public.xp_ledger
  ADD CONSTRAINT xp_ledger_reason_check
  CHECK (reason = ANY (ARRAY[
    'care_task_completed'::text,
    'community_post_created'::text,
    'community_comment_created'::text,
    'listing_completed'::text,
    'plant_added'::text,
    'plant_identified'::text
  ]));

CREATE INDEX IF NOT EXISTS xp_ledger_user_reason_created_idx ON public.xp_ledger (user_id, reason, created_at);

CREATE OR REPLACE FUNCTION public.award_capped_xp(target_user_id uuid, xp_amount integer, xp_reason text, daily_cap integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  day_start timestamptz := date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  awarded_today integer;
begin
  perform pg_advisory_xact_lock(hashtext(target_user_id::text || xp_reason));

  select count(*) into awarded_today
  from public.xp_ledger
  where user_id = target_user_id and reason = xp_reason and created_at >= day_start;

  if awarded_today >= daily_cap then
    return false;
  end if;

  insert into public.xp_ledger (user_id, amount, reason)
  values (target_user_id, xp_amount, xp_reason);
  return true;
end;
$$;

REVOKE ALL ON FUNCTION public.award_capped_xp(uuid, integer, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_capped_xp(uuid, integer, text, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.award_xp_for_new_post() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
begin
  perform public.award_capped_xp(new.user_id, 5, 'community_post_created', 3);
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.award_xp_for_new_comment() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
begin
  perform public.award_capped_xp(new.user_id, 3, 'community_comment_created', 5);
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.award_xp_for_new_plant() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
begin
  perform public.award_capped_xp(new.user_id, 5, 'plant_added', 3);
  return new;
end;
$$;

REVOKE ALL ON FUNCTION public.award_xp_for_new_plant() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE TRIGGER award_xp_after_plant_insert
  AFTER INSERT ON public.plants
  FOR EACH ROW EXECUTE FUNCTION public.award_xp_for_new_plant();
