drop policy "Users can update their own push tokens" on public.push_tokens;

create function public.register_push_token(p_token text)
returns void
language plpgsql security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  delete from public.push_tokens where token = p_token and user_id <> auth.uid();

  insert into public.push_tokens (user_id, token)
  values (auth.uid(), p_token)
  on conflict (token) do nothing;
end;
$$;

grant execute on function public.register_push_token(text) to authenticated;
