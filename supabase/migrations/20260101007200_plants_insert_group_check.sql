drop policy "Users can insert their own plants" on public.plants;
create policy "Users can insert their own plants"
  on public.plants for insert
  with check (
    auth.uid() = user_id
    and (
      group_id is null
      or exists (select 1 from public.plant_groups where plant_groups.id = plants.group_id and plant_groups.user_id = auth.uid())
    )
  );
