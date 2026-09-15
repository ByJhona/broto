alter table public.plant_species_info add column reference_photos jsonb not null default '[]'::jsonb;
