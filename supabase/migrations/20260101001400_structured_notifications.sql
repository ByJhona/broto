alter table public.notifications
  add column actor_id uuid references public.profiles(id) on delete set null;

alter table public.notifications
  alter column title drop not null,
  alter column message drop not null;

create index notifications_actor_id_idx on public.notifications(actor_id);

create or replace function public.handle_new_like()
returns trigger as $$
declare
  post_owner uuid;
begin
  select user_id into post_owner from public.posts where id = new.post_id;

  if post_owner != new.user_id then
    insert into public.notifications (user_id, actor_id, type, post_id)
    values (post_owner, new.user_id, 'like', new.post_id);
  end if;
  return new;
end;
$$ language plpgsql security definer;

create or replace function public.handle_new_comment()
returns trigger as $$
declare
  post_owner uuid;
begin
  select user_id into post_owner from public.posts where id = new.post_id;

  if post_owner != new.user_id then
    insert into public.notifications (user_id, actor_id, type, post_id)
    values (post_owner, new.user_id, 'comment', new.post_id);
  end if;
  return new;
end;
$$ language plpgsql security definer;
