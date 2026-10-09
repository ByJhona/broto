CREATE POLICY "Admins manage articles" ON public.articles
  FOR ALL TO authenticated
  USING ((SELECT private.has_role('admin')))
  WITH CHECK ((SELECT private.has_role('admin')));

GRANT INSERT, UPDATE, DELETE ON TABLE public.articles TO authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES ('article-covers', 'article-covers', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Article covers are publicly readable" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'article-covers');

CREATE POLICY "Admins upload article covers" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'article-covers' AND (SELECT private.has_role('admin')));
