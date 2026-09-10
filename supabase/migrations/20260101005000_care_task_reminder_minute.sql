alter table public.care_tasks
  add column reminder_minute integer not null default 0
  constraint care_tasks_reminder_minute_check check (reminder_minute >= 0 and reminder_minute <= 59);
