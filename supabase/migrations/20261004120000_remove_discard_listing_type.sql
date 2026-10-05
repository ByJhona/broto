UPDATE public.plant_listings SET listing_type = 'donation' WHERE listing_type = 'discard';

ALTER TABLE public.plant_listings DROP CONSTRAINT plant_listings_listing_type_check;

ALTER TABLE public.plant_listings
  ADD CONSTRAINT plant_listings_listing_type_check
  CHECK (listing_type = ANY (ARRAY['donation'::text, 'exchange'::text, 'sale'::text]));
