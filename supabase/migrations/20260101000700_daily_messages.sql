create table public.daily_messages (
  message_date date primary key default current_date,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.daily_messages enable row level security;

create policy "Anyone can view daily messages"
  on public.daily_messages for select
  using (true);
