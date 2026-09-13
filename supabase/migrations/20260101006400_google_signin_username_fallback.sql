CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;
