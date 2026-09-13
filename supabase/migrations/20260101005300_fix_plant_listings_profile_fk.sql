alter table public.plant_listings drop constraint plant_listings_user_id_fkey;
alter table public.plant_listings
  add constraint plant_listings_user_id_fkey foreign key (user_id) references public.profiles (id) on delete cascade;

alter table public.plant_listing_interests drop constraint plant_listing_interests_user_id_fkey;
alter table public.plant_listing_interests
  add constraint plant_listing_interests_user_id_fkey foreign key (user_id) references public.profiles (id) on delete cascade;
