drop policy "Users can update their own comments" on public.post_comments;

create policy "Users can update their own comments"
  on public.post_comments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy "Users can update their own posts" on public.posts;

create policy "Users can update their own posts"
  on public.posts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
