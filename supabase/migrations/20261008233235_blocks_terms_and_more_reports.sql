CREATE TABLE public.user_blocks (
  blocker_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles (id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT user_blocks_not_self CHECK (blocker_id <> blocked_id)
);

CREATE INDEX user_blocks_blocked_id_idx ON public.user_blocks (blocked_id);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own blocks" ON public.user_blocks
  FOR SELECT TO authenticated
  USING (blocker_id = (SELECT auth.uid()));

CREATE POLICY "Users block others" ON public.user_blocks
  FOR INSERT TO authenticated
  WITH CHECK (blocker_id = (SELECT auth.uid()));

CREATE POLICY "Users unblock others" ON public.user_blocks
  FOR DELETE TO authenticated
  USING (blocker_id = (SELECT auth.uid()));

REVOKE ALL ON TABLE public.user_blocks FROM anon, authenticated;
GRANT SELECT, DELETE ON TABLE public.user_blocks TO authenticated;
GRANT INSERT (blocked_id) ON TABLE public.user_blocks TO authenticated;
GRANT ALL ON TABLE public.user_blocks TO service_role;

CREATE OR REPLACE FUNCTION private.hidden_user_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(array_agg(other_id), '{}')
  FROM (
    SELECT blocked_id AS other_id FROM public.user_blocks WHERE blocker_id = (SELECT auth.uid())
    UNION
    SELECT blocker_id FROM public.user_blocks WHERE blocked_id = (SELECT auth.uid())
  ) ids;
$$;

REVOKE ALL ON FUNCTION private.hidden_user_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.hidden_user_ids() TO authenticated, service_role;

CREATE POLICY "Hide posts across blocks" ON public.posts
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (NOT (user_id = ANY ((SELECT private.hidden_user_ids())::uuid[])));

CREATE POLICY "Hide comments across blocks" ON public.post_comments
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (NOT (user_id = ANY ((SELECT private.hidden_user_ids())::uuid[])));

CREATE POLICY "Hide listings across blocks" ON public.plant_listings
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (NOT (user_id = ANY ((SELECT private.hidden_user_ids())::uuid[])));

CREATE POLICY "Hide events across blocks" ON public.events
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (NOT (user_id = ANY ((SELECT private.hidden_user_ids())::uuid[])));

CREATE POLICY "Hide notifications across blocks" ON public.notifications
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (actor_id IS NULL OR NOT (actor_id = ANY ((SELECT private.hidden_user_ids())::uuid[])));

CREATE POLICY "Hide messages across blocks" ON public.chat_messages
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (NOT (sender_id = ANY ((SELECT private.hidden_user_ids())::uuid[])) AND NOT (recipient_id = ANY ((SELECT private.hidden_user_ids())::uuid[])));

CREATE POLICY "No messages across blocks" ON public.chat_messages
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT (recipient_id = ANY ((SELECT private.hidden_user_ids())::uuid[])));

CREATE POLICY "Hide proposals across blocks" ON public.plant_listing_proposals
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (NOT (sender_id = ANY ((SELECT private.hidden_user_ids())::uuid[])) AND NOT (recipient_id = ANY ((SELECT private.hidden_user_ids())::uuid[])));

CREATE POLICY "No proposals across blocks" ON public.plant_listing_proposals
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT (recipient_id = ANY ((SELECT private.hidden_user_ids())::uuid[])));

ALTER TABLE public.profiles ADD COLUMN terms_accepted_at timestamptz;

ALTER TABLE public.content_reports
  ADD COLUMN listing_id uuid REFERENCES public.plant_listings (id) ON DELETE CASCADE,
  ADD COLUMN event_id uuid REFERENCES public.events (id) ON DELETE CASCADE,
  ADD COLUMN message_id uuid REFERENCES public.chat_messages (id) ON DELETE CASCADE,
  ADD COLUMN reported_user_id uuid REFERENCES public.profiles (id) ON DELETE CASCADE,
  DROP CONSTRAINT content_reports_single_target_check,
  ADD CONSTRAINT content_reports_single_target_check
    CHECK (num_nonnulls(post_id, comment_id, listing_id, event_id, message_id, reported_user_id) = 1);

CREATE UNIQUE INDEX content_reports_listing_reporter_key ON public.content_reports (listing_id, reporter_id) WHERE listing_id IS NOT NULL;
CREATE UNIQUE INDEX content_reports_event_reporter_key ON public.content_reports (event_id, reporter_id) WHERE event_id IS NOT NULL;
CREATE UNIQUE INDEX content_reports_message_reporter_key ON public.content_reports (message_id, reporter_id) WHERE message_id IS NOT NULL;
CREATE UNIQUE INDEX content_reports_user_reporter_key ON public.content_reports (reported_user_id, reporter_id) WHERE reported_user_id IS NOT NULL;

CREATE POLICY "Users only report messages they received" ON public.content_reports
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (
    message_id IS NULL
    OR EXISTS (SELECT 1 FROM public.chat_messages m WHERE m.id = message_id AND m.recipient_id = (SELECT auth.uid()))
  );

REVOKE INSERT ON TABLE public.content_reports FROM authenticated;
GRANT INSERT (post_id, comment_id, listing_id, event_id, message_id, reported_user_id, reason) ON TABLE public.content_reports TO authenticated;

CREATE POLICY "Moderators can view hidden listings" ON public.plant_listings
  FOR SELECT TO authenticated
  USING ((SELECT private.has_role('moderator')));

CREATE POLICY "Moderators can view hidden events" ON public.events
  FOR SELECT TO authenticated
  USING ((SELECT private.has_role('moderator')));

CREATE POLICY "Moderators can view reported messages" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (
    (SELECT private.has_role('moderator'))
    AND EXISTS (SELECT 1 FROM public.content_reports r WHERE r.message_id = chat_messages.id)
  );

CREATE OR REPLACE FUNCTION public.moderate_hide_content(p_content_type text, p_content_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  IF NOT private.has_role('moderator') THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  v_owner_id := private.hide_content_row(p_content_type, p_content_id);
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'content not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.content_reports
  SET status = 'actioned', resolved_by = (SELECT auth.uid()), resolved_at = now()
  WHERE status = 'open'
    AND (
      (p_content_type = 'post' AND post_id = p_content_id)
      OR (p_content_type = 'comment' AND comment_id = p_content_id)
      OR (p_content_type = 'listing' AND listing_id = p_content_id)
      OR (p_content_type = 'event' AND event_id = p_content_id)
    );

  PERFORM private.log_moderation_action('hide_content', v_owner_id, p_content_type, p_content_id, NULL, p_reason);
END;
$$;
