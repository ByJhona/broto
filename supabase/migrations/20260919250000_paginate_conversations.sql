CREATE OR REPLACE FUNCTION public.get_conversations(p_cursor timestamptz DEFAULT NULL, p_limit int DEFAULT 20)
RETURNS TABLE (
  other_user_id uuid,
  activity_at timestamptz,
  is_proposal boolean,
  is_sender boolean,
  message_body text,
  proposal_type text,
  proposal_status text
)
    LANGUAGE sql
    STABLE
    SET search_path TO 'public'
    AS $$
  with activity as (
    select
      case when sender_id = auth.uid() then recipient_id else sender_id end as other_user_id,
      created_at as activity_at,
      false as is_proposal,
      sender_id = auth.uid() as is_sender,
      body as message_body,
      null::text as proposal_type,
      null::text as proposal_status
    from chat_messages
    where sender_id = auth.uid() or recipient_id = auth.uid()

    union all

    select
      case when sender_id = auth.uid() then recipient_id else sender_id end as other_user_id,
      coalesce(responded_at, created_at) as activity_at,
      true as is_proposal,
      case when responded_at is not null then recipient_id = auth.uid() else sender_id = auth.uid() end as is_sender,
      null::text as message_body,
      proposal_type::text as proposal_type,
      status::text as proposal_status
    from plant_listing_proposals
    where sender_id = auth.uid() or recipient_id = auth.uid()
  ),
  visible as (
    select activity.*
    from activity
    left join chat_reads on chat_reads.user_id = auth.uid() and chat_reads.other_user_id = activity.other_user_id
    where chat_reads.hidden_before is null or activity.activity_at > chat_reads.hidden_before
  ),
  latest as (
    select distinct on (other_user_id) *
    from visible
    order by other_user_id, activity_at desc
  )
  select other_user_id, activity_at, is_proposal, is_sender, message_body, proposal_type, proposal_status
  from latest
  where p_cursor is null or activity_at < p_cursor
  order by activity_at desc
  limit p_limit;
$$;

CREATE OR REPLACE FUNCTION public.has_unread_conversations() RETURNS boolean
    LANGUAGE sql
    STABLE
    SET search_path TO 'public'
    AS $$
  with activity as (
    select
      case when sender_id = auth.uid() then recipient_id else sender_id end as other_user_id,
      created_at as activity_at,
      sender_id = auth.uid() as is_sender
    from chat_messages
    where sender_id = auth.uid() or recipient_id = auth.uid()

    union all

    select
      case when sender_id = auth.uid() then recipient_id else sender_id end as other_user_id,
      coalesce(responded_at, created_at) as activity_at,
      case when responded_at is not null then recipient_id = auth.uid() else sender_id = auth.uid() end as is_sender
    from plant_listing_proposals
    where sender_id = auth.uid() or recipient_id = auth.uid()
  )
  select exists (
    select 1
    from activity
    left join chat_reads on chat_reads.user_id = auth.uid() and chat_reads.other_user_id = activity.other_user_id
    where (chat_reads.hidden_before is null or activity.activity_at > chat_reads.hidden_before)
      and not activity.is_sender
      and (chat_reads.last_read_at is null or activity.activity_at > chat_reads.last_read_at)
  );
$$;
