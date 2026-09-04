alter table public.plants
  add column sun_level text
    check (sun_level in ('shade', 'partial_shade', 'medium', 'bright_indirect', 'full_sun'));

update public.plants
set sun_level = case
  when min_light_lux is null then null
  when min_light_lux < 1000 then 'shade'
  when min_light_lux < 5000 then 'partial_shade'
  when min_light_lux < 10000 then 'medium'
  when min_light_lux < 20000 then 'bright_indirect'
  else 'full_sun'
end;

alter table public.plants drop column min_light_lux;
alter table public.plants drop column max_light_lux;
