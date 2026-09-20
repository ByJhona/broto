ALTER TABLE "public"."chat_messages"
  ALTER COLUMN "body" DROP NOT NULL,
  ADD COLUMN "photo_url" "text",
  ADD CONSTRAINT "chat_messages_content_check" CHECK ((("body" IS NOT NULL) OR ("photo_url" IS NOT NULL)));

ALTER TABLE "public"."post_comments"
  ALTER COLUMN "text" DROP NOT NULL,
  ADD COLUMN "photo_url" "text",
  ADD CONSTRAINT "post_comments_content_check" CHECK ((("text" IS NOT NULL) OR ("photo_url" IS NOT NULL)));

INSERT INTO "storage"."buckets" ("id", "name", "public")
VALUES ('chat-photos', 'chat-photos', true)
ON CONFLICT ("id") DO NOTHING;

CREATE POLICY "Chat photos are publicly accessible."
  ON "storage"."objects" FOR SELECT
  USING (("bucket_id" = 'chat-photos'::"text"));

CREATE POLICY "Users can upload their own chat photos."
  ON "storage"."objects" FOR INSERT
  WITH CHECK ((("bucket_id" = 'chat-photos'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));

CREATE POLICY "Users can delete their own chat photos."
  ON "storage"."objects" FOR DELETE
  USING ((("bucket_id" = 'chat-photos'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));
