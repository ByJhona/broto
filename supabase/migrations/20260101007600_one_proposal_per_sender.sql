delete from public.chat_messages a using public.chat_messages b
where a.message_type in ('offer', 'interest')
  and b.message_type = a.message_type
  and a.listing_id = b.listing_id
  and a.sender_id = b.sender_id
  and a.created_at > b.created_at;

create unique index chat_messages_one_proposal_per_sender_idx
  on public.chat_messages (listing_id, sender_id, message_type)
  where message_type in ('offer', 'interest');
