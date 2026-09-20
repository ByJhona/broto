DROP POLICY "Anyone can view available listings" ON "public"."plant_listings";

CREATE POLICY "Anyone can view available or completed listings"
  ON "public"."plant_listings" FOR SELECT
  USING (
    ((deleted_at IS NULL) AND (status = ANY (ARRAY['available'::text, 'completed'::text])))
    OR (user_id = auth.uid())
  );
