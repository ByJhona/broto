alter table public.posts add column deleted_at timestamptz;
alter table public.post_comments add column deleted_at timestamptz;

drop policy "Posts are viewable by everyone" on public.posts;
create policy "Posts are viewable by everyone"
  on public.posts for select using (deleted_at is null);

drop policy "Users can delete their own posts" on public.posts;

drop policy "Post comments are viewable by everyone" on public.post_comments;
create policy "Post comments are viewable by everyone"
  on public.post_comments for select using (deleted_at is null);

drop policy "Users can delete their own comments" on public.post_comments;

create policy "Users can update their own comments"
  on public.post_comments for update using (auth.uid() = user_id);

create function public.cascade_soft_delete_comments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    update public.post_comments
    set deleted_at = new.deleted_at
    where post_id = new.id and deleted_at is null;
  end if;
  return new;
end;
$$;

create trigger on_post_soft_deleted
  after update on public.posts
  for each row execute function public.cascade_soft_delete_comments();
