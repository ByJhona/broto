update public.profiles
set name = username
where name is null;

alter table public.profiles
  alter column name set not null;
