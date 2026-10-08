CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE TYPE public.app_role AS ENUM ('moderator', 'admin');

CREATE TABLE public.user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  granted_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX user_roles_granted_by_idx ON public.user_roles (granted_by);
CREATE INDEX user_roles_role_idx ON public.user_roles (role);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.current_app_role()
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION private.has_role(required public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(private.current_app_role() >= required, false);
$$;

REVOKE ALL ON FUNCTION private.current_app_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.has_role(public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.current_app_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_role(public.app_role) TO authenticated, service_role;

CREATE POLICY "Users see their own role and admins see all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT private.has_role('admin')));

REVOKE ALL ON TABLE public.user_roles FROM anon, authenticated;
GRANT SELECT ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.current_app_role();
$$;

REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated, service_role;

ALTER TABLE public.content_reports
  ADD COLUMN status text NOT NULL DEFAULT 'open',
  ADD COLUMN resolved_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  ADD COLUMN resolved_at timestamptz,
  ADD CONSTRAINT content_reports_status_check CHECK (status IN ('open', 'dismissed', 'actioned'));

CREATE INDEX content_reports_open_idx ON public.content_reports (created_at DESC) WHERE status = 'open';
CREATE INDEX content_reports_resolved_by_idx ON public.content_reports (resolved_by);

CREATE POLICY "Moderators can view reports" ON public.content_reports
  FOR SELECT TO authenticated
  USING ((SELECT private.has_role('moderator')));

REVOKE INSERT ON TABLE public.content_reports FROM authenticated;
GRANT INSERT (post_id, comment_id, reason) ON TABLE public.content_reports TO authenticated;
GRANT SELECT ON TABLE public.content_reports TO authenticated;

CREATE TABLE public.moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  action text NOT NULL,
  target_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  content_type text,
  content_id uuid,
  report_id uuid REFERENCES public.content_reports (id) ON DELETE SET NULL,
  reason text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT moderation_actions_action_check CHECK (
    action IN ('hide_content', 'resolve_report', 'suspend_user', 'unsuspend_user', 'set_role', 'remove_role')
  ),
  CONSTRAINT moderation_actions_content_type_check CHECK (content_type IN ('post', 'comment', 'listing', 'event'))
);

CREATE INDEX moderation_actions_created_at_idx ON public.moderation_actions (created_at DESC);
CREATE INDEX moderation_actions_moderator_id_idx ON public.moderation_actions (moderator_id);
CREATE INDEX moderation_actions_target_user_id_idx ON public.moderation_actions (target_user_id);
CREATE INDEX moderation_actions_report_id_idx ON public.moderation_actions (report_id);

ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Moderators can view moderation actions" ON public.moderation_actions
  FOR SELECT TO authenticated
  USING ((SELECT private.has_role('moderator')));

REVOKE ALL ON TABLE public.moderation_actions FROM anon, authenticated;
GRANT SELECT ON TABLE public.moderation_actions TO authenticated;
GRANT ALL ON TABLE public.moderation_actions TO service_role;

CREATE OR REPLACE FUNCTION private.log_moderation_action(
  p_action text,
  p_target_user_id uuid,
  p_content_type text DEFAULT NULL,
  p_content_id uuid DEFAULT NULL,
  p_report_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO public.moderation_actions (moderator_id, action, target_user_id, content_type, content_id, report_id, reason, details)
  VALUES ((SELECT auth.uid()), p_action, p_target_user_id, p_content_type, p_content_id, p_report_id, p_reason, p_details);
$$;

REVOKE ALL ON FUNCTION private.log_moderation_action(text, uuid, text, uuid, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.hide_content_row(p_content_type text, p_content_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  CASE p_content_type
    WHEN 'post' THEN
      UPDATE public.posts SET deleted_at = now() WHERE id = p_content_id AND deleted_at IS NULL RETURNING user_id INTO v_owner_id;
    WHEN 'comment' THEN
      UPDATE public.post_comments SET deleted_at = now() WHERE id = p_content_id AND deleted_at IS NULL RETURNING user_id INTO v_owner_id;
    WHEN 'listing' THEN
      UPDATE public.plant_listings SET deleted_at = now() WHERE id = p_content_id AND deleted_at IS NULL RETURNING user_id INTO v_owner_id;
    WHEN 'event' THEN
      UPDATE public.events SET deleted_at = now() WHERE id = p_content_id AND deleted_at IS NULL RETURNING user_id INTO v_owner_id;
    ELSE
      RAISE EXCEPTION 'invalid content type' USING ERRCODE = '22023';
  END CASE;
  RETURN v_owner_id;
END;
$$;

REVOKE ALL ON FUNCTION private.hide_content_row(text, uuid) FROM PUBLIC, anon, authenticated;

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
    AND ((p_content_type = 'post' AND post_id = p_content_id) OR (p_content_type = 'comment' AND comment_id = p_content_id));

  PERFORM private.log_moderation_action('hide_content', v_owner_id, p_content_type, p_content_id, NULL, p_reason);
END;
$$;

REVOKE ALL ON FUNCTION public.moderate_hide_content(text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_hide_content(text, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.resolve_content_report(p_report_id uuid, p_status text, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.has_role('moderator') THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('dismissed', 'actioned') THEN
    RAISE EXCEPTION 'invalid report status' USING ERRCODE = '22023';
  END IF;

  UPDATE public.content_reports
  SET status = p_status, resolved_by = (SELECT auth.uid()), resolved_at = now()
  WHERE id = p_report_id AND status = 'open';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'open report not found' USING ERRCODE = 'P0002';
  END IF;

  PERFORM private.log_moderation_action('resolve_report', NULL, NULL, NULL, p_report_id, p_reason, jsonb_build_object('status', p_status));
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_content_report(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_content_report(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_user_role(p_user_id uuid, p_role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_count integer;
  v_is_admin boolean;
BEGIN
  IF NOT private.has_role('admin') THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  PERFORM 1 FROM public.user_roles WHERE role = 'admin' FOR UPDATE;
  SELECT count(*) INTO v_admin_count FROM public.user_roles WHERE role = 'admin';
  v_is_admin := EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = 'admin');

  IF v_is_admin AND p_role IS DISTINCT FROM 'admin' AND v_admin_count <= 1 THEN
    RAISE EXCEPTION 'cannot remove the last admin' USING ERRCODE = '23514';
  END IF;

  IF p_role IS NULL THEN
    DELETE FROM public.user_roles WHERE user_id = p_user_id;
    PERFORM private.log_moderation_action('remove_role', p_user_id);
  ELSE
    INSERT INTO public.user_roles (user_id, role, granted_by)
    VALUES (p_user_id, p_role, (SELECT auth.uid()))
    ON CONFLICT (user_id) DO UPDATE SET role = excluded.role, granted_by = excluded.granted_by, granted_at = now();
    PERFORM private.log_moderation_action('set_role', p_user_id, p_details => jsonb_build_object('role', p_role));
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, public.app_role) TO authenticated;
