ALTER TABLE public.revenuecat_processed_events
  ADD CONSTRAINT revenuecat_processed_events_transaction_id_key UNIQUE (transaction_id);

DROP TABLE IF EXISTS public.revenuecat_processed_purchases;
