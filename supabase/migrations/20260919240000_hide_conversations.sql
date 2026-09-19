ALTER TABLE public.chat_reads
  ADD COLUMN hidden_before timestamptz;

CREATE OR REPLACE FUNCTION public.hide_conversation(p_other_user_id uuid) RETURNS void
    LANGUAGE sql
    SET search_path TO 'public'
    AS $$
  insert into public.chat_reads (user_id, other_user_id, hidden_before)
  values (auth.uid(), p_other_user_id, now())
  on conflict (user_id, other_user_id) do update set hidden_before = now();
$$;
