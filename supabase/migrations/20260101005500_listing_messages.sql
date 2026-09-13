create table public.plant_listing_messages (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.plant_listings (id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  offered_plant_id uuid references public.plants (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  check (recipient_id <> sender_id)
);

alter table public.plant_listing_messages enable row level security;

create policy "Participants can view their listing messages"
  on public.plant_listing_messages for select
  using (sender_id = auth.uid() or recipient_id = auth.uid());

create policy "Participants can send listing messages"
  on public.plant_listing_messages for insert
  with check (sender_id = auth.uid());

create index plant_listing_messages_thread_idx
  on public.plant_listing_messages (listing_id, created_at);

alter publication supabase_realtime add table only public.plant_listing_messages;

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type = any (array['system', 'like', 'comment', 'listing_interest', 'listing_message']));

create function public.handle_new_listing_message() returns trigger
  language plpgsql security definer
  set search_path to 'public'
as $$
begin
  insert into public.notifications (user_id, actor_id, type, listing_id)
  values (new.recipient_id, new.sender_id, 'listing_message', new.listing_id);

  return new;
end;
$$;

create trigger on_listing_message_created
  after insert on public.plant_listing_messages
  for each row execute function public.handle_new_listing_message();
