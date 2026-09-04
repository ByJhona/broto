update public.profiles
set username = 'user_' || substr(id::text, 1, 8)
where username is null;

alter table public.profiles
  alter column username set not null;
