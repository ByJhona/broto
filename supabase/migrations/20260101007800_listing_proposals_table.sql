create table public.plant_listing_proposals (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.plant_listings (id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  proposal_type text not null check (proposal_type in ('offer', 'interest')),
  offered_plant_id uuid references public.plants (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  check (recipient_id <> sender_id),
  check (
    (proposal_type = 'offer' and offered_plant_id is not null)
    or (proposal_type = 'interest' and offered_plant_id is null)
  )
);

alter table public.plant_listing_proposals enable row level security;

create policy "Participants can view their proposals"
  on public.plant_listing_proposals for select
  using (sender_id = auth.uid() or recipient_id = auth.uid());

create policy "Users can send proposals"
  on public.plant_listing_proposals for insert
  with check (sender_id = auth.uid());

create policy "Recipients can respond to proposals"
  on public.plant_listing_proposals for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

create unique index plant_listing_proposals_one_per_sender_idx
  on public.plant_listing_proposals (listing_id, sender_id, proposal_type);

create index plant_listing_proposals_listing_id_idx on public.plant_listing_proposals (listing_id);

alter publication supabase_realtime add table only public.plant_listing_proposals;

create function public.handle_new_listing_proposal() returns trigger
  language plpgsql security definer
  set search_path to 'public'
as $$
begin
  insert into public.notifications (user_id, actor_id, type, listing_id)
  values (new.recipient_id, new.sender_id, 'listing_message', new.listing_id);

  return new;
end;
$$;

create trigger on_listing_proposal_created
  after insert on public.plant_listing_proposals
  for each row execute function public.handle_new_listing_proposal();

insert into public.plant_listing_proposals (id, listing_id, sender_id, recipient_id, proposal_type, offered_plant_id, status, created_at)
select id, listing_id, sender_id, recipient_id, message_type, offered_plant_id, offer_status, created_at
from public.chat_messages
where message_type in ('offer', 'interest');

delete from public.chat_messages where message_type in ('offer', 'interest', 'confirmation');

drop policy "Recipients can respond to offers" on public.chat_messages;

drop index chat_messages_one_proposal_per_sender_idx;

alter table public.chat_messages drop constraint chat_messages_offer_fields_check;
alter table public.chat_messages drop constraint chat_messages_message_type_check;

alter table public.chat_messages drop column message_type;
alter table public.chat_messages drop column offer_status;
alter table public.chat_messages drop column offered_plant_id;
alter table public.chat_messages drop column listing_id;

alter table public.chat_messages alter column body set not null;

create or replace function public.handle_new_listing_message() returns trigger
  language plpgsql security definer
  set search_path to 'public'
as $$
begin
  insert into public.notifications (user_id, actor_id, type, listing_id)
  values (new.recipient_id, new.sender_id, 'listing_message', null);

  return new;
end;
$$;
