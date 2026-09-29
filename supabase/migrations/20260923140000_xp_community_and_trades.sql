ALTER TABLE public.xp_ledger
  DROP CONSTRAINT xp_ledger_reason_check;

ALTER TABLE public.xp_ledger
  ADD CONSTRAINT xp_ledger_reason_check
  CHECK (reason = ANY (ARRAY[
    'care_task_completed'::text,
    'community_post_created'::text,
    'community_comment_created'::text,
    'listing_completed'::text
  ]));

CREATE OR REPLACE FUNCTION "public"."award_xp_for_new_post"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.xp_ledger (user_id, amount, reason)
  values (new.user_id, 5, 'community_post_created');

  return new;
end;
$$;

ALTER FUNCTION "public"."award_xp_for_new_post"() OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."award_xp_for_new_post"() TO "anon";
GRANT ALL ON FUNCTION "public"."award_xp_for_new_post"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."award_xp_for_new_post"() TO "service_role";

CREATE OR REPLACE TRIGGER "award_xp_after_post_insert" AFTER INSERT ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "public"."award_xp_for_new_post"();

CREATE OR REPLACE FUNCTION "public"."award_xp_for_new_comment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.xp_ledger (user_id, amount, reason)
  values (new.user_id, 3, 'community_comment_created');

  return new;
end;
$$;

ALTER FUNCTION "public"."award_xp_for_new_comment"() OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."award_xp_for_new_comment"() TO "anon";
GRANT ALL ON FUNCTION "public"."award_xp_for_new_comment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."award_xp_for_new_comment"() TO "service_role";

CREATE OR REPLACE TRIGGER "award_xp_after_comment_insert" AFTER INSERT ON "public"."post_comments" FOR EACH ROW EXECUTE FUNCTION "public"."award_xp_for_new_comment"();

CREATE OR REPLACE FUNCTION "public"."award_xp_for_completed_listing"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    insert into public.xp_ledger (user_id, amount, reason)
    values (new.user_id, 20, 'listing_completed');
  end if;

  return new;
end;
$$;

ALTER FUNCTION "public"."award_xp_for_completed_listing"() OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."award_xp_for_completed_listing"() TO "anon";
GRANT ALL ON FUNCTION "public"."award_xp_for_completed_listing"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."award_xp_for_completed_listing"() TO "service_role";

CREATE OR REPLACE TRIGGER "award_xp_after_listing_completed" AFTER UPDATE ON "public"."plant_listings" FOR EACH ROW EXECUTE FUNCTION "public"."award_xp_for_completed_listing"();
