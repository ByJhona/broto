alter table public.plants add column photo_urls text[] not null default '{}';
update public.plants set photo_urls = array[photo_url] where photo_url is not null;
alter table public.plants add constraint plants_photo_urls_max_check check (cardinality(photo_urls) <= 5);
alter table public.plants drop column photo_url;

alter table public.plant_listings add column photo_urls text[] not null default '{}';
update public.plant_listings set photo_urls = array[photo_url] where photo_url is not null;
alter table public.plant_listings add constraint plant_listings_photo_urls_max_check check (cardinality(photo_urls) <= 5);
alter table public.plant_listings drop column photo_url;
