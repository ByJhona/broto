CREATE TABLE IF NOT EXISTS public.credit_costs (
    reason text PRIMARY KEY,
    cost integer NOT NULL,
    CONSTRAINT credit_costs_cost_check CHECK (cost > 0)
);

ALTER TABLE public.credit_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view credit costs" ON public.credit_costs FOR SELECT USING (true);

GRANT ALL ON TABLE public.credit_costs TO anon;
GRANT ALL ON TABLE public.credit_costs TO authenticated;
GRANT ALL ON TABLE public.credit_costs TO service_role;

INSERT INTO public.credit_costs (reason, cost) VALUES
    ('identification', 2),
    ('diagnosis', 5),
    ('growth_check', 3),
    ('chat_question', 1),
    ('boost_content', 20)
ON CONFLICT (reason) DO NOTHING;

CREATE OR REPLACE FUNCTION public.consume_credit(credit_reason text DEFAULT 'identification'::text) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_monthly_credits integer;
  v_balance integer;
  v_cost integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));

  SELECT cost INTO v_cost FROM public.credit_costs WHERE reason = credit_reason;

  IF v_cost IS NULL THEN
    RAISE EXCEPTION 'invalid_credit_reason';
  END IF;

  SELECT p.monthly_credits INTO v_monthly_credits
  FROM public.subscriptions s
  JOIN public.plans p ON p.id = s.plan_id
  WHERE s.user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no_subscription';
  END IF;

  IF v_monthly_credits IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT public.get_credit_balance(auth.uid()) INTO v_balance;

  IF v_balance < v_cost THEN
    RAISE EXCEPTION 'insufficient_credits';
  END IF;

  INSERT INTO public.credit_ledger (user_id, amount, reason)
  VALUES (auth.uid(), -v_cost, credit_reason);

  RETURN public.get_credit_balance(auth.uid());
END;
$$;
