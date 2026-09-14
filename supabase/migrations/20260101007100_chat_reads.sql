create table public.chat_reads (
  user_id uuid not null references public.profiles (id) on delete cascade,
  other_user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, other_user_id)
);

alter table public.chat_reads enable row level security;

create policy "Users can view their own chat reads"
  on public.chat_reads for select
  using (user_id = auth.uid());

create policy "Users can insert their own chat reads"
  on public.chat_reads for insert
  with check (user_id = auth.uid());

create policy "Users can update their own chat reads"
  on public.chat_reads for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
