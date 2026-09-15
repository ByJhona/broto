create table public.badge_batches (
  id text primary key,
  name text not null,
  description text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

alter table public.badge_batches enable row level security;

create policy "Anyone can view badge batches"
  on public.badge_batches for select
  using (true);

create table public.badges (
  id text primary key,
  batch_id text not null references public.badge_batches (id) on delete cascade,
  name text not null,
  description text not null,
  pixel_art jsonb not null,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

alter table public.badges enable row level security;

create policy "Anyone can view badges"
  on public.badges for select
  using (true);

create index badges_batch_id_idx on public.badges (batch_id);

create table public.user_badges (
  user_id uuid not null references auth.users (id) on delete cascade,
  badge_id text not null references public.badges (id) on delete cascade,
  granted_at timestamptz not null default now(),
  source text not null,
  primary key (user_id, badge_id)
);

alter table public.user_badges enable row level security;

create policy "Anyone can view user badges"
  on public.user_badges for select
  using (true);

create index user_badges_user_id_idx on public.user_badges (user_id);

create function public.grant_badge(p_user_id uuid, p_badge_id text, p_source text) returns void
  language plpgsql security definer
  set search_path to 'public'
as $$
begin
  insert into public.user_badges (user_id, badge_id, source)
  values (p_user_id, p_badge_id, p_source)
  on conflict (user_id, badge_id) do nothing;
end;
$$;

grant execute on function public.grant_badge(uuid, text, text) to service_role;
