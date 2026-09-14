alter table public.plant_chat_messages alter column plant_id drop not null;

drop policy "Users can insert their own plant chat messages" on public.plant_chat_messages;
create policy "Users can insert their own plant chat messages"
  on public.plant_chat_messages for insert
  with check (
    auth.uid() = user_id
    and (
      plant_id is null
      or exists (select 1 from public.plants where plants.id = plant_chat_messages.plant_id and plants.user_id = auth.uid())
    )
  );
