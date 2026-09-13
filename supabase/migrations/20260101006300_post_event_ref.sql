alter table public.posts add column event_id uuid references public.events (id) on delete set null;
