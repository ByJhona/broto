alter table public.plants add column deleted_at timestamptz;
alter table public.plant_listings add column deleted_at timestamptz;
alter table public.events add column deleted_at timestamptz;
alter table public.care_tasks add column deleted_at timestamptz;
alter table public.notifications add column deleted_at timestamptz;

drop policy "Anyone can view available listings" on public.plant_listings;
create policy "Anyone can view available listings"
  on public.plant_listings for select
  using ((deleted_at is null and status = 'available') or user_id = auth.uid());

drop policy "Anyone can view events" on public.events;
create policy "Anyone can view events"
  on public.events for select
  using (deleted_at is null or user_id = auth.uid());
