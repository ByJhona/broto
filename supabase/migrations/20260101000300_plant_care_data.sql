create table public.plant_species_info (
  id uuid primary key default gen_random_uuid(),
  scientific_name text not null unique,
  description text not null,
  watering_description text not null,
  watering_days_min integer not null,
  watering_days_max integer not null,
  sun_level text not null
    check (sun_level in ('shade', 'partial_shade', 'medium', 'bright_indirect', 'full_sun')),
  min_temp integer not null,
  max_temp integer not null,
  min_humidity integer not null,
  max_humidity integer not null,
  care_level text not null check (care_level in ('easy', 'moderate', 'hard')),
  toxic_to_pets boolean not null,
  toxic_to_pets_notes text,
  toxic_to_humans boolean not null,
  toxic_to_humans_notes text,
  fun_facts text[] not null default '{}',
  common_problems jsonb not null default '[]',
  origin text,
  source text not null default 'openai',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.plant_species_info enable row level security;

create policy "Anyone can view plant species info"
  on public.plant_species_info for select
  using (true);

create trigger plant_species_info_set_updated_at
  before update on public.plant_species_info
  for each row
  execute function public.set_updated_at();

create table public.plant_growth_checkins (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  photo_url text not null,
  observations text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.plant_growth_checkins enable row level security;

create policy "Users can view their own growth checkins"
  on public.plant_growth_checkins for select
  using (auth.uid() = user_id);

create policy "Users can insert their own growth checkins"
  on public.plant_growth_checkins for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own growth checkins"
  on public.plant_growth_checkins for delete
  using (auth.uid() = user_id);

create index plant_growth_checkins_plant_id_idx on public.plant_growth_checkins (plant_id, created_at);

create table public.plant_diagnoses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  photo_url text not null,
  health_status text not null check (health_status in ('healthy', 'attention', 'urgent')),
  summary text not null,
  issues jsonb not null default '[]',
  recommended_actions text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.plant_diagnoses enable row level security;

create policy "Users can view their own diagnoses"
  on public.plant_diagnoses for select
  using (auth.uid() = user_id);

create policy "Users can insert their own diagnoses"
  on public.plant_diagnoses for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own diagnoses"
  on public.plant_diagnoses for delete
  using (auth.uid() = user_id);

create index plant_diagnoses_user_id_idx on public.plant_diagnoses (user_id, created_at desc);
