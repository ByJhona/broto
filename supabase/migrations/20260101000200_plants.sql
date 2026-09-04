create table public.plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  species text,
  common_name text,
  family text,
  genus text,
  identification_score real
    check (identification_score is null or (identification_score >= 0 and identification_score <= 1)),
  photo_url text,
  watering_days integer
    check (watering_days is null or watering_days > 0),
  min_light_lux integer,
  max_light_lux integer,
  min_temp integer,
  max_temp integer,
  min_humidity integer,
  max_humidity integer,
  min_soil_moisture integer,
  max_soil_moisture integer,
  origin text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.plants enable row level security;

create policy "Users can view their own plants"
  on public.plants for select
  using (auth.uid() = user_id);

create policy "Users can insert their own plants"
  on public.plants for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own plants"
  on public.plants for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own plants"
  on public.plants for delete
  using (auth.uid() = user_id);

create index plants_user_id_idx on public.plants (user_id);

create trigger plants_set_updated_at
  before update on public.plants
  for each row
  execute function public.set_updated_at();

insert into storage.buckets (id, name, public)
values ('plant-photos', 'plant-photos', true)
on conflict (id) do nothing;

create policy "Users can upload their own plant photos"
  on storage.objects for insert
  with check (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own plant photos"
  on storage.objects for update
  using (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own plant photos"
  on storage.objects for delete
  using (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Plant photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'plant-photos');
