alter table public.posts
  add column post_type text not null default 'dica'
  check (post_type in ('conquista', 'duvida', 'dica'));

alter table public.posts alter column post_type drop default;
