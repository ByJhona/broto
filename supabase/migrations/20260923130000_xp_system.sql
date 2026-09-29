CREATE TABLE IF NOT EXISTS "public"."xp_ledger" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" integer NOT NULL,
    "reason" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "xp_ledger_reason_check" CHECK (("reason" = ANY (ARRAY['care_task_completed'::"text"])))
);

ALTER TABLE "public"."xp_ledger" OWNER TO "postgres";

ALTER TABLE ONLY "public"."xp_ledger"
    ADD CONSTRAINT "xp_ledger_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."xp_ledger"
    ADD CONSTRAINT "xp_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

CREATE INDEX "xp_ledger_user_id_idx" ON "public"."xp_ledger" USING "btree" ("user_id");

ALTER TABLE "public"."xp_ledger" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own xp ledger" ON "public"."xp_ledger" FOR SELECT USING (("auth"."uid"() = "user_id"));

GRANT ALL ON TABLE "public"."xp_ledger" TO "anon";
GRANT ALL ON TABLE "public"."xp_ledger" TO "authenticated";
GRANT ALL ON TABLE "public"."xp_ledger" TO "service_role";

CREATE OR REPLACE FUNCTION "public"."get_xp_balance"("target_user_id" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(sum(amount), 0)::integer
  from public.xp_ledger
  where user_id = target_user_id;
$$;

ALTER FUNCTION "public"."get_xp_balance"("target_user_id" "uuid") OWNER TO "postgres";

REVOKE ALL ON FUNCTION "public"."get_xp_balance"("target_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_xp_balance"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_xp_balance"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_xp_balance"("target_user_id" "uuid") TO "service_role";

CREATE OR REPLACE FUNCTION "public"."award_xp_for_care_completion"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.xp_ledger (user_id, amount, reason)
  values (new.user_id, 10, 'care_task_completed');

  return new;
end;
$$;

ALTER FUNCTION "public"."award_xp_for_care_completion"() OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."award_xp_for_care_completion"() TO "anon";
GRANT ALL ON FUNCTION "public"."award_xp_for_care_completion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."award_xp_for_care_completion"() TO "service_role";

CREATE OR REPLACE TRIGGER "award_xp_after_care_completion" AFTER INSERT ON "public"."care_task_completions" FOR EACH ROW EXECUTE FUNCTION "public"."award_xp_for_care_completion"();
