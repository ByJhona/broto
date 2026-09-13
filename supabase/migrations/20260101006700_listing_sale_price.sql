alter table public.plant_listings drop constraint plant_listings_listing_type_check;
alter table public.plant_listings add constraint plant_listings_listing_type_check
  check (listing_type in ('donation', 'exchange', 'discard', 'sale'));

alter table public.plant_listings add column price_cents integer;

alter table public.plant_listings add constraint plant_listings_price_cents_check
  check (
    (listing_type = 'sale' and price_cents is not null and price_cents > 0)
    or (listing_type <> 'sale' and price_cents is null)
  );
