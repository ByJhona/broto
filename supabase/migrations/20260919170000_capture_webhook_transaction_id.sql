ALTER TABLE public.revenuecat_processed_events
  ADD COLUMN IF NOT EXISTS transaction_id text;
