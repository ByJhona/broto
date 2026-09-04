create table public.app_versions (
  platform text primary key check (platform in ('android', 'ios')),
  latest_version_code integer not null,
  store_url text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_versions enable row level security;

create policy "App versions are publicly readable"
  on public.app_versions for select
  using (true);

create trigger app_versions_set_updated_at
  before update on public.app_versions
  for each row
  execute function public.set_updated_at();

insert into public.app_versions (platform, latest_version_code, store_url)
values ('android', 6, 'https://play.google.com/store/apps/details?id=com.byjhona.broto');
