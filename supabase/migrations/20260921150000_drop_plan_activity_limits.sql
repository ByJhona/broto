DROP TRIGGER IF EXISTS "check_listing_limit_before_insert" ON "public"."plant_listings";
DROP TRIGGER IF EXISTS "check_event_limit_before_insert" ON "public"."events";

DROP FUNCTION IF EXISTS "public"."check_listing_limit"();
DROP FUNCTION IF EXISTS "public"."check_event_limit"();

DROP FUNCTION "public"."get_my_credits"();

CREATE FUNCTION "public"."get_my_credits"() RETURNS TABLE("plan_id" "text", "plan_name" "text", "monthly_credits" integer, "balance" integer, "credit_renewal_period" "text", "max_listing_photos" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select p.id, p.name, p.monthly_credits,
    case when p.monthly_credits is null then null
         else public.get_credit_balance(auth.uid())
    end as balance,
    p.credit_renewal_period,
    p.max_listing_photos
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.user_id = auth.uid();
$$;

ALTER FUNCTION "public"."get_my_credits"() OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."get_my_credits"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_credits"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_credits"() TO "service_role";

ALTER TABLE "public"."plans" DROP COLUMN "max_active_listings";
ALTER TABLE "public"."plans" DROP COLUMN "max_events_per_month";
