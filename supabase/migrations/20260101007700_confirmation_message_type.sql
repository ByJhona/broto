alter table public.chat_messages drop constraint chat_messages_message_type_check;
alter table public.chat_messages add constraint chat_messages_message_type_check
  check (message_type in ('text', 'offer', 'interest', 'confirmation'));

alter table public.chat_messages drop constraint chat_messages_offer_fields_check;
alter table public.chat_messages add constraint chat_messages_offer_fields_check check (
  (message_type = 'offer' and listing_id is not null and offered_plant_id is not null and offer_status is not null)
  or (message_type = 'interest' and listing_id is not null and offer_status is not null)
  or (message_type = 'text')
  or (message_type = 'confirmation')
);
