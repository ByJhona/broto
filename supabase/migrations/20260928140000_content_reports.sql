CREATE TABLE IF NOT EXISTS "public"."content_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reporter_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "post_id" "uuid",
    "comment_id" "uuid",
    "reason" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "content_reports_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "content_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
    CONSTRAINT "content_reports_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE,
    CONSTRAINT "content_reports_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."post_comments"("id") ON DELETE CASCADE,
    CONSTRAINT "content_reports_single_target_check" CHECK (("num_nonnulls"("post_id", "comment_id") = 1)),
    CONSTRAINT "content_reports_reason_check" CHECK (("reason" = ANY (ARRAY['spam'::"text", 'inappropriate'::"text", 'scam'::"text", 'other'::"text"])))
);

ALTER TABLE "public"."content_reports" OWNER TO "postgres";

CREATE UNIQUE INDEX "content_reports_post_reporter_key" ON "public"."content_reports" USING "btree" ("post_id", "reporter_id") WHERE ("post_id" IS NOT NULL);
CREATE UNIQUE INDEX "content_reports_comment_reporter_key" ON "public"."content_reports" USING "btree" ("comment_id", "reporter_id") WHERE ("comment_id" IS NOT NULL);
CREATE INDEX "content_reports_reporter_id_idx" ON "public"."content_reports" USING "btree" ("reporter_id");

ALTER TABLE "public"."content_reports" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can report content" ON "public"."content_reports"
  FOR INSERT TO "authenticated"
  WITH CHECK (("reporter_id" = ( SELECT "auth"."uid"() AS "uid")));

REVOKE ALL ON TABLE "public"."content_reports" FROM "anon", "authenticated";
GRANT INSERT ON TABLE "public"."content_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."content_reports" TO "service_role";
