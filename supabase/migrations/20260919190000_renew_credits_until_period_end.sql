CREATE OR REPLACE FUNCTION public.renew_all_subscriptions() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  sub record;
BEGIN
  FOR sub IN
    SELECT s.id AS subscription_id, s.user_id, p.monthly_credits
    FROM public.subscriptions s
    JOIN public.plans p ON p.id = s.plan_id
    WHERE p.credit_renewal_period = 'weekly'
      AND p.monthly_credits IS NOT NULL
      AND s.last_renewal_at <= now() - interval '7 days'
      AND (
        s.status = 'active'
        OR (s.status = 'canceled' AND (s.current_period_end IS NULL OR s.current_period_end > now()))
      )
  LOOP
    PERFORM public.reset_credits_to_plan(sub.user_id, sub.monthly_credits, 'weekly_grant');

    UPDATE public.subscriptions
    SET last_renewal_at = now()
    WHERE id = sub.subscription_id;
  END LOOP;
END;
$$;
