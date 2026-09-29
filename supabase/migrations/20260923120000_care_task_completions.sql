CREATE TABLE IF NOT EXISTS "public"."care_task_completions" (
    "user_id" "uuid" NOT NULL,
    "completed_date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."care_task_completions" OWNER TO "postgres";

ALTER TABLE ONLY "public"."care_task_completions"
    ADD CONSTRAINT "care_task_completions_pkey" PRIMARY KEY ("user_id", "completed_date");

ALTER TABLE ONLY "public"."care_task_completions"
    ADD CONSTRAINT "care_task_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."care_task_completions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own care task completions" ON "public"."care_task_completions" FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can insert their own care task completions" ON "public"."care_task_completions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

GRANT ALL ON TABLE "public"."care_task_completions" TO "anon";
GRANT ALL ON TABLE "public"."care_task_completions" TO "authenticated";
GRANT ALL ON TABLE "public"."care_task_completions" TO "service_role";
