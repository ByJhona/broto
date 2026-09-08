alter table public.plants
  add column description text,
  add column watering_description text,
  add column care_level text check (care_level in ('easy', 'moderate', 'hard')),
  add column toxic_to_pets boolean,
  add column toxic_to_pets_notes text,
  add column toxic_to_humans boolean,
  add column toxic_to_humans_notes text,
  add column fun_facts text[],
  add column common_problems jsonb;
