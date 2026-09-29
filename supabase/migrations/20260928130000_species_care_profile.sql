truncate table public.plant_species_info;

alter table public.plant_species_info
  drop column watering_description,
  add column family text,
  add column plant_type text not null,
  add column light_tip text not null,
  add column watering_tip text not null,
  add column humidity_level text not null,
  add column humidity_tip text not null,
  add column temperature_min_c smallint not null,
  add column temperature_max_c smallint not null,
  add column soil_tip text not null,
  add column fertilizing_tip text not null,
  add column mature_size text not null,
  add column growth_rate text not null,
  add column propagation_methods text[] not null default '{}',
  add column content_version integer not null,
  alter column common_names set not null,
  add constraint plant_species_info_humidity_level_check check (humidity_level in ('low', 'medium', 'high')),
  add constraint plant_species_info_growth_rate_check check (growth_rate in ('slow', 'medium', 'fast')),
  add constraint plant_species_info_watering_days_check check (watering_days_min > 0 and watering_days_max >= watering_days_min),
  add constraint plant_species_info_temperature_check check (temperature_max_c >= temperature_min_c);

alter table public.plants
  drop column sun_level,
  drop column origin,
  drop column description,
  drop column watering_description,
  drop column care_level,
  drop column toxic_to_pets,
  drop column toxic_to_pets_notes,
  drop column toxic_to_humans,
  drop column toxic_to_humans_notes,
  drop column fun_facts,
  drop column common_problems;
