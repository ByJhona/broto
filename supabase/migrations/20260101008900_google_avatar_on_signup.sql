create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer
  set search_path to 'public'
as $$
declare
  base_username text;
  final_username text;
  suffix integer := 0;
begin
  if new.raw_user_meta_data->>'username' is not null then
    final_username := new.raw_user_meta_data->>'username';
  else
    base_username := regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9_]', '', 'g');
    if base_username !~ '^[a-z]' then
      base_username := 'user_' || base_username;
    end if;
    base_username := left(base_username, 20);

    final_username := base_username;
    while exists (select 1 from public.profiles where username = final_username) loop
      suffix := suffix + 1;
      final_username := left(base_username, 19 - length(suffix::text)) || '_' || suffix;
    end loop;
  end if;

  insert into public.profiles (id, name, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    final_username,
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  );
  return new;
end;
$$;

update public.profiles p
set avatar_url = coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')
from auth.users u
where p.id = u.id
  and p.avatar_url is null
  and coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture') is not null;
