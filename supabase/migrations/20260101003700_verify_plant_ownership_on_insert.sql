drop policy "Users can insert their own plant chat messages" on public.plant_chat_messages;

create policy "Users can insert their own plant chat messages"
  on public.plant_chat_messages for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.plants where id = plant_id and user_id = auth.uid())
  );

drop policy "Users can insert their own task completions" on public.care_task_completions;

create policy "Users can insert their own task completions"
  on public.care_task_completions for insert
  with check (
    auth.uid() = user_id
    and (plant_id is null or exists (select 1 from public.plants where id = plant_id and user_id = auth.uid()))
  );
