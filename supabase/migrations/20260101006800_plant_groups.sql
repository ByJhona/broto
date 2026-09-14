create table public.plant_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.plant_groups enable row level security;

create policy "Users can view their own plant groups"
  on public.plant_groups for select
  using (user_id = auth.uid());

create policy "Users can insert their own plant groups"
  on public.plant_groups for insert
  with check (user_id = auth.uid());

create policy "Users can update their own plant groups"
  on public.plant_groups for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own plant groups"
  on public.plant_groups for delete
  using (user_id = auth.uid());

create index plant_groups_user_id_idx on public.plant_groups (user_id);

alter table public.plants add column group_id uuid references public.plant_groups (id) on delete set null;

create index plants_group_id_idx on public.plants (group_id);

create function public.cascade_plant_group_soft_delete() returns trigger
  language plpgsql
  set search_path to 'public'
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    update public.plants
    set deleted_at = new.deleted_at
    where group_id = new.id and deleted_at is null;
  end if;

  return new;
end;
$$;

create trigger on_plant_group_soft_delete
  after update on public.plant_groups
  for each row execute function public.cascade_plant_group_soft_delete();
