CREATE POLICY "Moderators can view hidden posts" ON public.posts
  FOR SELECT TO authenticated
  USING ((SELECT private.has_role('moderator')));

CREATE POLICY "Moderators can view hidden comments" ON public.post_comments
  FOR SELECT TO authenticated
  USING ((SELECT private.has_role('moderator')));
