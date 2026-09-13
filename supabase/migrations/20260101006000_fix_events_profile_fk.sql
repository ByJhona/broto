alter table public.events drop constraint events_user_id_fkey;
alter table public.events
  add constraint events_user_id_fkey foreign key (user_id) references public.profiles (id) on delete cascade;

alter table public.event_attendees drop constraint event_attendees_user_id_fkey;
alter table public.event_attendees
  add constraint event_attendees_user_id_fkey foreign key (user_id) references public.profiles (id) on delete cascade;
