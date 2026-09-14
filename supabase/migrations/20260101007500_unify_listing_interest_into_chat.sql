alter table public.chat_messages drop constraint chat_messages_message_type_check;
alter table public.chat_messages add constraint chat_messages_message_type_check
  check (message_type in ('text', 'offer', 'interest'));

alter table public.chat_messages drop constraint chat_messages_offer_fields_check;
alter table public.chat_messages add constraint chat_messages_offer_fields_check check (
  (message_type = 'offer' and listing_id is not null and offered_plant_id is not null and offer_status is not null)
  or (message_type = 'interest' and listing_id is not null and offer_status is not null)
  or (message_type = 'text')
);

drop policy "Recipients can respond to offers" on public.chat_messages;
create policy "Recipients can respond to offers"
  on public.chat_messages for update
  using (recipient_id = auth.uid() and message_type in ('offer', 'interest'))
  with check (recipient_id = auth.uid() and message_type in ('offer', 'interest'));

drop trigger on_listing_interest_created on public.plant_listing_interests;
drop function public.handle_new_listing_interest();
drop table public.plant_listing_interests;
