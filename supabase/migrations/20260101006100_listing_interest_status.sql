alter table public.plant_listing_interests
  add column status text not null default 'pending' check (status in ('pending', 'accepted', 'declined'));

create policy "Listing owner can update interest status"
  on public.plant_listing_interests for update
  using (exists (select 1 from public.plant_listings l where l.id = listing_id and l.user_id = auth.uid()))
  with check (exists (select 1 from public.plant_listings l where l.id = listing_id and l.user_id = auth.uid()));
