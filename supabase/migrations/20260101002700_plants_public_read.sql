create policy "Plants are viewable by everyone"
  on public.plants for select
  using (true);
