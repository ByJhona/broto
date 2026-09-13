alter table public.posts add column listing_id uuid references public.plant_listings (id) on delete set null;
