CREATE OR REPLACE FUNCTION public.get_suspensions(p_user_ids uuid[] DEFAULT NULL)
RETURNS TABLE (user_id uuid, banned_until timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.has_role('moderator') THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT u.id, u.banned_until
  FROM auth.users u
  WHERE u.banned_until > now()
    AND (p_user_ids IS NULL OR u.id = ANY (p_user_ids))
  ORDER BY u.banned_until;
END;
$$;

REVOKE ALL ON FUNCTION public.get_suspensions(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_suspensions(uuid[]) TO authenticated;
