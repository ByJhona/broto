DROP POLICY "Users can insert their own care task completions" ON "public"."care_task_completions";

CREATE POLICY "Users can insert their own care task completions"
  ON "public"."care_task_completions" FOR INSERT
  WITH CHECK ((auth.uid() = user_id) AND (completed_date = CURRENT_DATE));

ALTER TABLE "public"."plant_listings" ADD COLUMN "xp_awarded_at" timestamp with time zone;

CREATE OR REPLACE FUNCTION "public"."award_xp_for_completed_listing"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' and new.xp_awarded_at is null then
    insert into public.xp_ledger (user_id, amount, reason)
    values (new.user_id, 20, 'listing_completed');

    new.xp_awarded_at := now();
  end if;

  return new;
end;
$$;

CREATE OR REPLACE TRIGGER "award_xp_after_listing_completed" BEFORE UPDATE ON "public"."plant_listings" FOR EACH ROW EXECUTE FUNCTION "public"."award_xp_for_completed_listing"();
