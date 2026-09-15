create table public.push_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_id text not null unique,
  token text not null,
  created_at timestamptz not null default now()
);

alter table public.push_tickets enable row level security;

create index push_tickets_created_at_idx on public.push_tickets (created_at);

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'push_receipts_cron_secret') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'push_receipts_cron_secret',
      'Bearer secret for the check-push-receipts cron job'
    );
  end if;
end $$;

select cron.schedule(
  'send-care-reminders',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://qjooaimeitfrlficipgp.supabase.co/functions/v1/send-care-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'care_reminders_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'check-push-receipts',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://qjooaimeitfrlficipgp.supabase.co/functions/v1/check-push-receipts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'push_receipts_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

drop table public.care_reminder_log;
