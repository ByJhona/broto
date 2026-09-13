create table public.plant_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plant_id uuid references public.plants (id) on delete set null,
  listing_type text not null check (listing_type in ('donation', 'exchange', 'discard')),
  title text not null,
  description text,
  photo_url text,
  latitude double precision not null,
  longitude double precision not null,
  status text not null default 'available' check (status in ('available', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table public.plant_listings enable row level security;

create policy "Anyone can view available listings"
  on public.plant_listings for select
  using (status = 'available' or user_id = auth.uid());

create policy "Users can insert their own listings"
  on public.plant_listings for insert
  with check (user_id = auth.uid());

create policy "Users can update their own listings"
  on public.plant_listings for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own listings"
  on public.plant_listings for delete
  using (user_id = auth.uid());

create index plant_listings_status_idx on public.plant_listings (status);
create index plant_listings_user_id_idx on public.plant_listings (user_id);

create table public.plant_listing_interests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.plant_listings (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  message text,
  created_at timestamptz not null default now(),
  unique (listing_id, user_id)
);

alter table public.plant_listing_interests enable row level security;

create policy "Listing owner and interested user can view interest"
  on public.plant_listing_interests for select
  using (
    user_id = auth.uid()
    or exists (select 1 from public.plant_listings l where l.id = listing_id and l.user_id = auth.uid())
  );

create policy "Users can express interest in listings"
  on public.plant_listing_interests for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.plant_listings l
      where l.id = listing_id and l.user_id <> auth.uid() and l.status = 'available'
    )
  );

create policy "Users can withdraw their own interest"
  on public.plant_listing_interests for delete
  using (user_id = auth.uid());

create index plant_listing_interests_listing_id_idx on public.plant_listing_interests (listing_id);

alter table public.notifications
  add column listing_id uuid references public.plant_listings (id) on delete cascade;

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type = any (array['system', 'like', 'comment', 'listing_interest']));

create function public.handle_new_listing_interest() returns trigger
  language plpgsql security definer
  set search_path to 'public'
as $$
declare
  listing_owner uuid;
begin
  select user_id into listing_owner from public.plant_listings where id = new.listing_id;

  insert into public.notifications (user_id, actor_id, type, listing_id)
  values (listing_owner, new.user_id, 'listing_interest', new.listing_id);

  return new;
end;
$$;

create trigger on_listing_interest_created
  after insert on public.plant_listing_interests
  for each row execute function public.handle_new_listing_interest();
