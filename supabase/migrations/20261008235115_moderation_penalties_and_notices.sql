CREATE TABLE public.user_penalties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  kind text NOT NULL,
  reason text,
  report_id uuid REFERENCES public.content_reports (id) ON DELETE SET NULL,
  ends_at timestamptz,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT user_penalties_kind_check CHECK (kind IN ('warning', 'restriction', 'suspension', 'ban')),
  CONSTRAINT user_penalties_duration_check CHECK (
    (kind IN ('warning', 'ban') AND ends_at IS NULL) OR (kind IN ('restriction', 'suspension') AND ends_at IS NOT NULL)
  )
);

CREATE INDEX user_penalties_user_id_idx ON public.user_penalties (user_id, created_at DESC);
CREATE INDEX user_penalties_active_idx ON public.user_penalties (user_id) WHERE revoked_at IS NULL AND kind <> 'warning';
CREATE INDEX user_penalties_created_by_idx ON public.user_penalties (created_by);
CREATE INDEX user_penalties_revoked_by_idx ON public.user_penalties (revoked_by);
CREATE INDEX user_penalties_report_id_idx ON public.user_penalties (report_id);

ALTER TABLE public.user_penalties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own penalties and moderators see all" ON public.user_penalties
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT private.has_role('moderator')));

REVOKE ALL ON TABLE public.user_penalties FROM anon, authenticated;
GRANT SELECT ON TABLE public.user_penalties TO authenticated;
GRANT ALL ON TABLE public.user_penalties TO service_role;

INSERT INTO public.user_penalties (user_id, kind, ends_at, reason)
SELECT
  u.id,
  CASE WHEN u.banned_until > now() + interval '50 years' THEN 'ban' ELSE 'suspension' END,
  CASE WHEN u.banned_until > now() + interval '50 years' THEN NULL ELSE u.banned_until END,
  'Suspensão aplicada antes do histórico de penalidades'
FROM auth.users u
WHERE u.banned_until > now();

CREATE OR REPLACE FUNCTION private.sanctioned_user_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(array_agg(DISTINCT user_id), '{}')
  FROM public.user_penalties
  WHERE kind IN ('suspension', 'ban') AND revoked_at IS NULL AND (ends_at IS NULL OR ends_at > now());
$$;

CREATE OR REPLACE FUNCTION private.is_restricted()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_penalties
    WHERE user_id = (SELECT auth.uid())
      AND kind IN ('restriction', 'suspension', 'ban')
      AND revoked_at IS NULL
      AND (ends_at IS NULL OR ends_at > now())
  );
$$;

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
    UNION
    SELECT unnest(private.sanctioned_user_ids()) WHERE NOT private.has_role('moderator')
  ) ids
  WHERE other_id IS DISTINCT FROM (SELECT auth.uid());
$$;

REVOKE ALL ON FUNCTION private.sanctioned_user_ids() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.is_restricted() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_restricted() TO authenticated, service_role;

CREATE POLICY "Restricted users cannot post" ON public.posts
  AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT (SELECT private.is_restricted()));
CREATE POLICY "Restricted users cannot comment" ON public.post_comments
  AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT (SELECT private.is_restricted()));
CREATE POLICY "Restricted users cannot list plants" ON public.plant_listings
  AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT (SELECT private.is_restricted()));
CREATE POLICY "Restricted users cannot create events" ON public.events
  AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT (SELECT private.is_restricted()));
CREATE POLICY "Restricted users cannot send messages" ON public.chat_messages
  AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT (SELECT private.is_restricted()));
CREATE POLICY "Restricted users cannot send proposals" ON public.plant_listing_proposals
  AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT (SELECT private.is_restricted()));

ALTER TABLE public.moderation_actions DROP CONSTRAINT moderation_actions_action_check;
ALTER TABLE public.moderation_actions ADD CONSTRAINT moderation_actions_action_check CHECK (
  action IN (
    'hide_content', 'resolve_report', 'suspend_user', 'unsuspend_user', 'set_role', 'remove_role',
    'warn_user', 'restrict_user', 'ban_user', 'revoke_penalty'
  )
);

ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (
  type IN (
    'system', 'like', 'comment', 'listing_interest', 'care_setup_reminder', 'care_reminder',
    'promo_winner', 'promo_result', 'moderation'
  )
);

CREATE OR REPLACE FUNCTION private.notify_user(
  p_user_id uuid,
  p_title_pt text,
  p_message_pt text,
  p_title_en text,
  p_message_en text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO public.notifications (user_id, type, title, message)
  SELECT p.id, 'moderation',
    CASE WHEN p.locale = 'en' THEN p_title_en ELSE p_title_pt END,
    CASE WHEN p.locale = 'en' THEN p_message_en ELSE p_message_pt END
  FROM public.profiles p
  WHERE p.id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION private.close_reports(p_report_ids uuid[], p_status text)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH closed AS (
    UPDATE public.content_reports
    SET status = p_status, resolved_by = (SELECT auth.uid()), resolved_at = now()
    WHERE id = ANY (p_report_ids) AND status = 'open'
    RETURNING reporter_id
  ),
  notified AS (
    INSERT INTO public.notifications (user_id, type, title, message)
    SELECT DISTINCT p.id, 'moderation',
      CASE WHEN p.locale = 'en' THEN 'Report reviewed' ELSE 'Denúncia analisada' END,
      CASE
        WHEN p_status = 'actioned' AND p.locale = 'en' THEN 'Thanks for reporting. We reviewed it and took action.'
        WHEN p_status = 'actioned' THEN 'Obrigado por denunciar. Analisamos e tomamos uma providência.'
        WHEN p.locale = 'en' THEN 'Thanks for reporting. We reviewed it and found no violation of the Terms of Use.'
        ELSE 'Obrigado por denunciar. Analisamos e não encontramos violação dos Termos de Uso.'
      END
    FROM closed c
    JOIN public.profiles p ON p.id = c.reporter_id
    RETURNING 1
  )
  SELECT count(*)::integer FROM closed;
$$;

CREATE OR REPLACE FUNCTION private.reason_suffix(p_reason text, p_locale text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_reason IS NULL OR btrim(p_reason) = '' THEN ''
    WHEN p_locale = 'en' THEN ' Reason: ' || btrim(p_reason) || '.'
    ELSE ' Motivo: ' || btrim(p_reason) || '.'
  END;
$$;

REVOKE ALL ON FUNCTION private.notify_user(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.close_reports(uuid[], text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.reason_suffix(text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.moderate_hide_content(p_content_type text, p_content_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owner_id uuid;
  v_report_ids uuid[];
  v_label_pt text;
  v_label_en text;
BEGIN
  IF NOT private.has_role('moderator') THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  v_owner_id := private.hide_content_row(p_content_type, p_content_id);
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'content not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT coalesce(array_agg(id), '{}') INTO v_report_ids
  FROM public.content_reports
  WHERE status = 'open'
    AND (
      (p_content_type = 'post' AND post_id = p_content_id)
      OR (p_content_type = 'comment' AND comment_id = p_content_id)
      OR (p_content_type = 'listing' AND listing_id = p_content_id)
      OR (p_content_type = 'event' AND event_id = p_content_id)
    );
  PERFORM private.close_reports(v_report_ids, 'actioned');

  v_label_pt := CASE p_content_type
    WHEN 'post' THEN 'Sua publicação foi removida'
    WHEN 'comment' THEN 'Seu comentário foi removido'
    WHEN 'listing' THEN 'Seu anúncio foi removido'
    ELSE 'Seu evento foi removido'
  END;
  v_label_en := CASE p_content_type WHEN 'post' THEN 'post' WHEN 'comment' THEN 'comment' WHEN 'listing' THEN 'listing' ELSE 'event' END;
  PERFORM private.notify_user(
    v_owner_id,
    'Conteúdo removido',
    v_label_pt || ' por violar os Termos de Uso.' || private.reason_suffix(p_reason, 'pt'),
    'Content removed',
    'Your ' || v_label_en || ' was removed for violating the Terms of Use.' || private.reason_suffix(p_reason, 'en')
  );

  PERFORM private.log_moderation_action('hide_content', v_owner_id, p_content_type, p_content_id, NULL, p_reason);
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_content_reports(p_report_ids uuid[], p_status text, p_reason text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_closed integer;
BEGIN
  IF NOT private.has_role('moderator') THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('dismissed', 'actioned') THEN
    RAISE EXCEPTION 'invalid report status' USING ERRCODE = '22023';
  END IF;

  v_closed := private.close_reports(p_report_ids, p_status);
  IF v_closed = 0 THEN
    RAISE EXCEPTION 'open report not found' USING ERRCODE = 'P0002';
  END IF;

  PERFORM private.log_moderation_action(
    'resolve_report', NULL, NULL, NULL, p_report_ids[1], p_reason,
    jsonb_build_object('status', p_status, 'count', v_closed)
  );
  RETURN v_closed;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_content_reports(uuid[], text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_content_reports(uuid[], text, text) TO authenticated;

CREATE OR REPLACE FUNCTION private.assert_can_penalize(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_target_role public.app_role;
BEGIN
  IF NOT private.has_role('moderator') THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT role INTO v_target_role FROM public.user_roles WHERE user_id = p_user_id;
  IF p_user_id = (SELECT auth.uid())
    OR v_target_role = 'admin'
    OR (v_target_role = 'moderator' AND NOT private.has_role('admin')) THEN
    RAISE EXCEPTION 'cannot penalize this user' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION private.penalty_notice(p_kind text, p_ends_at timestamptz, p_locale text)
RETURNS text[]
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_locale = 'en' THEN CASE p_kind
      WHEN 'warning' THEN ARRAY['Moderation warning', 'You received a warning for violating the Terms of Use. Further violations may lead to restrictions or suspension.']
      WHEN 'restriction' THEN ARRAY['Account restricted', 'You can''t post, comment or send messages until ' || to_char(p_ends_at AT TIME ZONE 'America/Sao_Paulo', 'MM/DD/YYYY') || ' for violating the Terms of Use.']
      WHEN 'suspension' THEN ARRAY['Account suspended', 'Your account is suspended until ' || to_char(p_ends_at AT TIME ZONE 'America/Sao_Paulo', 'MM/DD/YYYY') || ' for violating the Terms of Use.']
      ELSE ARRAY['Account banned', 'Your account was permanently banned for violating the Terms of Use.']
    END
    ELSE CASE p_kind
      WHEN 'warning' THEN ARRAY['Aviso da moderação', 'Você recebeu um aviso por violar os Termos de Uso. Novas violações podem levar a restrição ou suspensão.']
      WHEN 'restriction' THEN ARRAY['Conta restrita', 'Você não pode publicar, comentar nem enviar mensagens até ' || to_char(p_ends_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') || ' por violar os Termos de Uso.']
      WHEN 'suspension' THEN ARRAY['Conta suspensa', 'Sua conta está suspensa até ' || to_char(p_ends_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') || ' por violar os Termos de Uso.']
      ELSE ARRAY['Conta banida', 'Sua conta foi banida definitivamente por violar os Termos de Uso.']
    END
  END;
$$;

REVOKE ALL ON FUNCTION private.assert_can_penalize(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.penalty_notice(text, timestamptz, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.apply_penalty(
  p_user_id uuid,
  p_kind text,
  p_days integer DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_report_ids uuid[] DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ends_at timestamptz;
  v_penalty_id uuid;
  v_notice_pt text[];
  v_notice_en text[];
  v_appeal_pt text := ' Para contestar, escreva para jhonatantecno23@gmail.com.';
  v_appeal_en text := ' To appeal, write to jhonatantecno23@gmail.com.';
BEGIN
  PERFORM private.assert_can_penalize(p_user_id);

  IF p_kind IN ('restriction', 'suspension') THEN
    IF p_days IS NULL OR p_days < 1 OR p_days > 3650 THEN
      RAISE EXCEPTION 'invalid duration' USING ERRCODE = '22023';
    END IF;
    v_ends_at := now() + make_interval(days => p_days);
  ELSIF p_kind NOT IN ('warning', 'ban') THEN
    RAISE EXCEPTION 'invalid penalty' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.user_penalties (user_id, kind, reason, report_id, ends_at, created_by)
  VALUES (p_user_id, p_kind, nullif(btrim(p_reason), ''), p_report_ids[1], v_ends_at, (SELECT auth.uid()))
  RETURNING id INTO v_penalty_id;

  IF p_report_ids IS NOT NULL THEN
    PERFORM private.close_reports(p_report_ids, 'actioned');
  END IF;

  v_notice_pt := private.penalty_notice(p_kind, v_ends_at, 'pt');
  v_notice_en := private.penalty_notice(p_kind, v_ends_at, 'en');
  PERFORM private.notify_user(
    p_user_id,
    v_notice_pt[1], v_notice_pt[2] || private.reason_suffix(p_reason, 'pt') || v_appeal_pt,
    v_notice_en[1], v_notice_en[2] || private.reason_suffix(p_reason, 'en') || v_appeal_en
  );

  PERFORM private.log_moderation_action(
    CASE p_kind WHEN 'warning' THEN 'warn_user' WHEN 'restriction' THEN 'restrict_user' WHEN 'suspension' THEN 'suspend_user' ELSE 'ban_user' END,
    p_user_id, NULL, NULL, p_report_ids[1], p_reason,
    jsonb_build_object('days', p_days, 'penalty_id', v_penalty_id)
  );
  RETURN v_penalty_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_penalty(p_penalty_id uuid, p_reason text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT user_id INTO v_user_id FROM public.user_penalties WHERE id = p_penalty_id AND revoked_at IS NULL;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'active penalty not found' USING ERRCODE = 'P0002';
  END IF;
  PERFORM private.assert_can_penalize(v_user_id);

  UPDATE public.user_penalties SET revoked_at = now(), revoked_by = (SELECT auth.uid()) WHERE id = p_penalty_id;

  PERFORM private.notify_user(
    v_user_id,
    'Penalidade removida', 'A equipe de moderação removeu uma penalidade da sua conta.',
    'Penalty lifted', 'The moderation team lifted a penalty from your account.'
  );
  PERFORM private.log_moderation_action('revoke_penalty', v_user_id, NULL, NULL, NULL, p_reason, jsonb_build_object('penalty_id', p_penalty_id));
  RETURN v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_penalty(uuid, text, integer, text, uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_penalty(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_penalty(uuid, text, integer, text, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_penalty(uuid, text) TO authenticated;
