DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-care-reminders') THEN
    PERFORM cron.unschedule('send-care-reminders');
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-push-receipts') THEN
    PERFORM cron.unschedule('check-push-receipts');
  END IF;
END;
$$;

SELECT cron.schedule(
  'send-care-reminders',
  '*/5 * * * *',
  $job$
  select net.http_post(
    url := 'https://qjooaimeitfrlficipgp.supabase.co/functions/v1/send-care-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'care_reminders_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $job$
);

SELECT cron.schedule(
  'check-push-receipts',
  '*/15 * * * *',
  $job$
  select net.http_post(
    url := 'https://qjooaimeitfrlficipgp.supabase.co/functions/v1/check-push-receipts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'push_receipts_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $job$
);
