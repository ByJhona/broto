create function public.mark_conversation_read(p_other_user_id uuid) returns void
  language sql
  set search_path to 'public'
as $$
  insert into public.chat_reads (user_id, other_user_id, last_read_at)
  values (auth.uid(), p_other_user_id, now())
  on conflict (user_id, other_user_id) do update set last_read_at = now();
$$;

grant execute on function public.mark_conversation_read(uuid) to authenticated;
