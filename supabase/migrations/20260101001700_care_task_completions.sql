create table public.care_task_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plant_id uuid references public.plants(id) on delete cascade,
  task_id text not null,
  task_title text not null,
  category text not null,
  completed_at timestamptz not null default now()
);

alter table public.care_task_completions enable row level security;

create policy "Users can view their own task completions"
  on public.care_task_completions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own task completions"
  on public.care_task_completions for insert
  with check (auth.uid() = user_id);

create index care_task_completions_plant_id_idx on public.care_task_completions(plant_id);
create index care_task_completions_user_id_idx on public.care_task_completions(user_id);
