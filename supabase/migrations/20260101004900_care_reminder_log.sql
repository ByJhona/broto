create table public.care_reminder_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  care_task_id uuid references public.care_tasks (id) on delete set null,
  event text not null check (event in ('scheduled', 'canceled')),
  scheduled_for timestamptz,
  created_at timestamptz not null default now()
);

alter table public.care_reminder_log enable row level security;

create policy "Users can view their own reminder log"
  on public.care_reminder_log for select
  using (auth.uid() = user_id);

create policy "Users can insert their own reminder log"
  on public.care_reminder_log for insert
  with check (auth.uid() = user_id);

create index care_reminder_log_user_id_idx on public.care_reminder_log (user_id);
create index care_reminder_log_care_task_id_idx on public.care_reminder_log (care_task_id);
