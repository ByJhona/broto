create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  read boolean not null default false,
  type text not null default 'system' check (type in ('system', 'like', 'comment')),
  post_id uuid references public.posts(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update their own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

create policy "Users can delete their own notifications"
  on public.notifications for delete
  using (auth.uid() = user_id);

create index notifications_post_id_idx on public.notifications(post_id);

create function public.handle_new_like()
returns trigger as $$
declare
  post_owner uuid;
  liker_name text;
begin
  select user_id into post_owner from public.posts where id = new.post_id;

  if post_owner != new.user_id then
    select name into liker_name from public.profiles where id = new.user_id;

    if liker_name is null or liker_name = '' then
      select username into liker_name from public.profiles where id = new.user_id;
    end if;

    if liker_name is null or liker_name = '' then
      liker_name := 'Alguém';
    end if;

    insert into public.notifications (user_id, title, message, type, post_id)
    values (
      post_owner,
      'Nova curtida ❤️',
      liker_name || ' acabou de curtir a sua foto!',
      'like',
      new.post_id
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_like_created
  after insert on public.post_likes
  for each row execute function public.handle_new_like();

create function public.handle_new_comment()
returns trigger as $$
declare
  post_owner uuid;
  commenter_name text;
begin
  select user_id into post_owner from public.posts where id = new.post_id;

  if post_owner != new.user_id then
    select name into commenter_name from public.profiles where id = new.user_id;

    if commenter_name is null or commenter_name = '' then
      select username into commenter_name from public.profiles where id = new.user_id;
    end if;

    if commenter_name is null or commenter_name = '' then
      commenter_name := 'Alguém';
    end if;

    insert into public.notifications (user_id, title, message, type, post_id)
    values (
      post_owner,
      'Novo recado 💬',
      commenter_name || ' deixou um recado na sua foto!',
      'comment',
      new.post_id
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_comment_created
  after insert on public.post_comments
  for each row execute function public.handle_new_comment();
