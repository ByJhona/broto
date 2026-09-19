UPDATE public.plant_listings SET status = 'cancelled' WHERE status = 'expired';

ALTER TABLE public.plant_listings
  DROP CONSTRAINT plant_listings_status_check;

ALTER TABLE public.plant_listings
  ADD CONSTRAINT plant_listings_status_check
  CHECK (status = ANY (ARRAY['available'::text, 'completed'::text, 'cancelled'::text]));
