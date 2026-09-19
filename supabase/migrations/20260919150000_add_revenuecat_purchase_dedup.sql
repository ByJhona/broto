CREATE TABLE IF NOT EXISTS public.revenuecat_processed_purchases (
    purchase_id text PRIMARY KEY,
    processed_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.revenuecat_processed_purchases ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.revenuecat_processed_purchases TO anon;
GRANT ALL ON TABLE public.revenuecat_processed_purchases TO authenticated;
GRANT ALL ON TABLE public.revenuecat_processed_purchases TO service_role;
