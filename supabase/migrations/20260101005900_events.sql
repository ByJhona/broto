create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  description text,
  photo_url text,
  event_date timestamptz not null,
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;

create policy "Anyone can view events"
  on public.events for select
  using (true);

create policy "Users can insert their own events"
  on public.events for insert
  with check (user_id = auth.uid());

create policy "Users can update their own events"
  on public.events for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own events"
  on public.events for delete
  using (user_id = auth.uid());

create index events_event_date_idx on public.events (event_date);
create index events_user_id_idx on public.events (user_id);

create table public.event_attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

alter table public.event_attendees enable row level security;

create policy "Anyone can view event attendees"
  on public.event_attendees for select
  using (true);

create policy "Users can confirm their own attendance"
  on public.event_attendees for insert
  with check (user_id = auth.uid());

create policy "Users can cancel their own attendance"
  on public.event_attendees for delete
  using (user_id = auth.uid());

create index event_attendees_event_id_idx on public.event_attendees (event_id);
