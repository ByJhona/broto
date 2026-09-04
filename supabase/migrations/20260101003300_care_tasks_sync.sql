create table public.care_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plant_id uuid references public.plants(id) on delete cascade,
  title text not null,
  plant_name text,
  plant_photo_url text,
  category text not null,
  notes text,
  start_date date not null,
  recurrence_days integer check (recurrence_days is null or recurrence_days > 0),
  reminder_hour integer not null default 9 check (reminder_hour >= 0 and reminder_hour <= 23),
  last_completed_occurrence date,
  last_reminded_occurrence date,
  created_at timestamptz not null default now()
);

alter table public.care_tasks enable row level security;

create policy "Users can view their own care tasks"
  on public.care_tasks for select
  using (auth.uid() = user_id);

create policy "Users can insert their own care tasks"
  on public.care_tasks for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own care tasks"
  on public.care_tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own care tasks"
  on public.care_tasks for delete
  using (auth.uid() = user_id);

create index care_tasks_user_id_idx on public.care_tasks (user_id);
create index care_tasks_plant_id_idx on public.care_tasks (plant_id);

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now()
);

alter table public.push_tokens enable row level security;

create policy "Users can view their own push tokens"
  on public.push_tokens for select
  using (auth.uid() = user_id);

create policy "Users can insert their own push tokens"
  on public.push_tokens for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own push tokens"
  on public.push_tokens for delete
  using (auth.uid() = user_id);

create index push_tokens_user_id_idx on public.push_tokens (user_id);

create extension if not exists pg_net with schema extensions;

select vault.create_secret(
  replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  'care_reminders_cron_secret'
);

select cron.schedule(
  'send-care-reminders',
  '0 * * * *',
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
