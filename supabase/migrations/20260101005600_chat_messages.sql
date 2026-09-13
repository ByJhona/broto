alter table public.plant_listing_messages rename to chat_messages;

alter table public.chat_messages alter column listing_id drop not null;

alter table public.chat_messages add column message_type text not null default 'text' check (message_type in ('text', 'offer'));
alter table public.chat_messages add column offer_status text check (offer_status in ('pending', 'accepted', 'declined'));

alter table public.chat_messages add constraint chat_messages_offer_fields_check check (
  (message_type = 'offer' and listing_id is not null and offered_plant_id is not null and offer_status is not null)
  or (message_type = 'text')
);

create policy "Recipients can respond to offers"
  on public.chat_messages for update
  using (recipient_id = auth.uid() and message_type = 'offer')
  with check (recipient_id = auth.uid() and message_type = 'offer');
