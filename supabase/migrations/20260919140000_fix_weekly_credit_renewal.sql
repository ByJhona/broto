DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reset_weekly_plan_credits') THEN
    PERFORM cron.unschedule('reset_weekly_plan_credits');
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.reset_weekly_plan_credits();

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
      AND s.status = 'active'
      AND p.monthly_credits IS NOT NULL
      AND s.last_renewal_at <= now() - interval '7 days'
  LOOP
    PERFORM public.reset_credits_to_plan(sub.user_id, sub.monthly_credits, 'weekly_grant');

    UPDATE public.subscriptions
    SET last_renewal_at = now()
    WHERE id = sub.subscription_id;
  END LOOP;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly_credit_renewal_job') THEN
    PERFORM cron.schedule('weekly_credit_renewal_job', '0 3 * * *', 'select public.renew_all_subscriptions();');
  END IF;
END $$;
