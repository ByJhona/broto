drop policy "Posts are viewable by everyone" on public.posts;

create policy "Posts are viewable by everyone"
  on public.posts for select
  using (deleted_at is null or auth.uid() = user_id);

drop policy "Post comments are viewable by everyone" on public.post_comments;

create policy "Post comments are viewable by everyone"
  on public.post_comments for select
  using (deleted_at is null or auth.uid() = user_id);
