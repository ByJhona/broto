alter table public.plant_chat_messages
  add column session_id uuid not null default gen_random_uuid();

drop index if exists public.plant_chat_messages_plant_id_idx;

create index plant_chat_messages_session_id_idx
  on public.plant_chat_messages (plant_id, session_id, created_at);
