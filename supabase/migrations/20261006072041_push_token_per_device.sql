ALTER TABLE public.push_tokens ADD COLUMN device_id text;

CREATE UNIQUE INDEX push_tokens_device_id_key ON public.push_tokens (device_id);

DELETE FROM public.push_tokens t
WHERE EXISTS (
  SELECT 1 FROM public.push_tokens newer
  WHERE newer.user_id = t.user_id AND newer.created_at > t.created_at
);

DROP FUNCTION public.register_push_token(text);

CREATE FUNCTION public.register_push_token(p_token text, p_device_id text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  delete from public.push_tokens where token = p_token or device_id = p_device_id;

  insert into public.push_tokens (user_id, token, device_id)
  values (auth.uid(), p_token, p_device_id);
end;
$$;

REVOKE ALL ON FUNCTION public.register_push_token(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_push_token(text, text) TO authenticated;
