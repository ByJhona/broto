SET check_function_bodies = false;

CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";

CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";

CREATE EXTENSION IF NOT EXISTS "unaccent" WITH SCHEMA "public";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

CREATE OR REPLACE FUNCTION "public"."award_capped_xp"("target_user_id" "uuid", "xp_amount" integer, "xp_reason" "text", "daily_cap" integer) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  day_start timestamptz := date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  awarded_today integer;
begin
  perform pg_advisory_xact_lock(hashtext(target_user_id::text || xp_reason));

  select count(*) into awarded_today
  from public.xp_ledger
  where user_id = target_user_id and reason = xp_reason and created_at >= day_start;

  if awarded_today >= daily_cap then
    return false;
  end if;

  insert into public.xp_ledger (user_id, amount, reason)
  values (target_user_id, xp_amount, xp_reason);
  return true;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."award_xp_for_care_completion"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.xp_ledger (user_id, amount, reason)
  values (new.user_id, 10, 'care_task_completed');

  return new;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."award_xp_for_completed_listing"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' and new.xp_awarded_at is null then
    insert into public.xp_ledger (user_id, amount, reason)
    values (new.user_id, 20, 'listing_completed');

    new.xp_awarded_at := now();
  end if;

  return new;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."award_xp_for_new_comment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  perform public.award_capped_xp(new.user_id, 3, 'community_comment_created', 5);
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."award_xp_for_new_plant"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  perform public.award_capped_xp(new.user_id, 5, 'plant_added', 3);
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."award_xp_for_new_post"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  perform public.award_capped_xp(new.user_id, 5, 'community_post_created', 3);
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."boost_content"("p_content_type" "text", "p_content_id" "uuid") RETURNS timestamp with time zone
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_owner_id uuid;
  v_boosted_until timestamptz;
begin
  if p_content_type not in ('post', 'listing', 'event') then
    raise exception 'invalid_content_type';
  end if;

  if p_content_type = 'post' then
    select user_id into v_owner_id from public.posts where id = p_content_id and deleted_at is null;
  elsif p_content_type = 'listing' then
    select user_id into v_owner_id from public.plant_listings where id = p_content_id and deleted_at is null;
  else
    select user_id into v_owner_id from public.events where id = p_content_id and deleted_at is null;
  end if;

  if v_owner_id is null then
    raise exception 'content_not_found';
  end if;

  if v_owner_id <> auth.uid() then
    raise exception 'not_owner';
  end if;

  perform public.consume_credit('boost_content');

  v_boosted_until := now() + interval '48 hours';

  if p_content_type = 'post' then
    update public.posts set boosted_until = v_boosted_until where id = p_content_id;
  elsif p_content_type = 'listing' then
    update public.plant_listings set boosted_until = v_boosted_until where id = p_content_id;
  else
    update public.events set boosted_until = v_boosted_until where id = p_content_id;
  end if;

  return v_boosted_until;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."cascade_plant_group_soft_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    update public.plants
    set deleted_at = new.deleted_at
    where group_id = new.id and deleted_at is null;
  end if;

  return new;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."cascade_plant_soft_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    update public.care_tasks
    set deleted_at = new.deleted_at
    where plant_id = new.id and deleted_at is null;
  end if;

  return new;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."cascade_soft_delete_comments"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    update public.post_comments
    set deleted_at = new.deleted_at
    where post_id = new.id and deleted_at is null;
  end if;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."consume_credit"("credit_reason" "text" DEFAULT 'identification'::"text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_monthly_credits integer;
  v_balance integer;
  v_cost integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));

  SELECT cost INTO v_cost FROM public.credit_costs WHERE reason = credit_reason;

  IF v_cost IS NULL THEN
    RAISE EXCEPTION 'invalid_credit_reason';
  END IF;

  SELECT p.monthly_credits INTO v_monthly_credits
  FROM public.subscriptions s
  JOIN public.plans p ON p.id = s.plan_id
  WHERE s.user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no_subscription';
  END IF;

  IF v_monthly_credits IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT public.get_credit_balance(auth.uid()) INTO v_balance;

  IF v_balance < v_cost THEN
    RAISE EXCEPTION 'insufficient_credits';
  END IF;

  INSERT INTO public.credit_ledger (user_id, amount, reason)
  VALUES (auth.uid(), -v_cost, credit_reason);

  RETURN public.get_credit_balance(auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION "public"."current_care_streak"("target_user_id" "uuid", "as_of" "date") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with dates as (
    select completed_date,
           completed_date - (row_number() over (order by completed_date))::integer as grp
    from public.care_task_completions
    where user_id = target_user_id and completed_date <= as_of
  ),
  runs as (
    select grp, count(*) as len, max(completed_date) as last_date
    from dates
    group by grp
  )
  select coalesce((select len from runs where last_date = as_of), 0);
$$;

CREATE OR REPLACE FUNCTION "public"."draw_promo_winner"("p_campaign_id" "uuid", "p_winning_number" integer, "p_notify_others" boolean DEFAULT true) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_campaign public.promo_campaigns;
  v_winner_id uuid;
  v_number text := lpad(p_winning_number::text, greatest(4, length(p_winning_number::text)), '0');
begin
  select * into v_campaign from public.promo_campaigns where id = p_campaign_id for update;
  if not found then
    raise exception 'campaign_not_found';
  end if;
  if v_campaign.drawn_at is not null then
    raise exception 'already_drawn';
  end if;

  select user_id into v_winner_id
  from public.promo_redemptions
  where campaign_id = p_campaign_id and lucky_number = p_winning_number;
  if v_winner_id is null then
    raise exception 'number_not_found';
  end if;

  update public.promo_campaigns
  set drawn_at = now(), winning_number = p_winning_number
  where id = p_campaign_id;

  insert into public.notifications (user_id, type, title, message)
  select
    r.user_id,
    case when r.user_id = v_winner_id then 'promo_winner' else 'promo_result' end,
    case
      when r.user_id = v_winner_id and coalesce(p.locale, 'pt') like 'en%' then 'You won the ' || v_campaign.name || ' draw!'
      when r.user_id = v_winner_id then 'Você ganhou o sorteio ' || v_campaign.name || '!'
      when coalesce(p.locale, 'pt') like 'en%' then 'The ' || v_campaign.name || ' draw results are out'
      else 'Saiu o resultado do sorteio ' || v_campaign.name
    end,
    case
      when r.user_id = v_winner_id and coalesce(p.locale, 'pt') like 'en%' then 'Your lucky number ' || v_number || ' was drawn. Tap to arrange your prize.'
      when r.user_id = v_winner_id then 'Seu número da sorte ' || v_number || ' foi sorteado. Toque para combinar a entrega.'
      when coalesce(p.locale, 'pt') like 'en%' then 'The winning number was ' || v_number || '. Thanks for joining!'
      else 'O número sorteado foi ' || v_number || '. Obrigado por participar!'
    end
  from public.promo_redemptions r
  left join public.profiles p on p.id = r.user_id
  where r.campaign_id = p_campaign_id
    and r.lucky_number is not null
    and (p_notify_others or r.user_id = v_winner_id);

  return v_winner_id;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."generate_promo_codes"("p_campaign_id" "uuid", "p_count" integer, "p_prefix" "text" DEFAULT 'BROTO'::"text") RETURNS SETOF "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code text;
  v_generated integer := 0;
begin
  while v_generated < p_count loop
    v_code := upper(p_prefix) || '-' || (
      select string_agg(substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1), '')
      from generate_series(1, 6)
    );

    insert into public.promo_codes (code, campaign_id, max_uses)
    values (v_code, p_campaign_id, 1)
    on conflict (code) do nothing;

    if found then
      v_generated := v_generated + 1;
      return next v_code;
    end if;
  end loop;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."get_conversations"("p_cursor" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_limit" integer DEFAULT 20) RETURNS TABLE("other_user_id" "uuid", "activity_at" timestamp with time zone, "is_proposal" boolean, "is_sender" boolean, "message_body" "text", "has_photo" boolean, "proposal_type" "text", "proposal_status" "text")
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  with activity as (
    select
      case when sender_id = auth.uid() then recipient_id else sender_id end as other_user_id,
      created_at as activity_at,
      false as is_proposal,
      sender_id = auth.uid() as is_sender,
      body as message_body,
      photo_url is not null as has_photo,
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
      false as has_photo,
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
  select other_user_id, activity_at, is_proposal, is_sender, message_body, has_photo, proposal_type, proposal_status
  from latest
  where p_cursor is null or activity_at < p_cursor
  order by activity_at desc
  limit p_limit;
$$;

CREATE OR REPLACE FUNCTION "public"."get_credit_balance"("target_user_id" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(sum(amount), 0)::integer
  from public.credit_ledger
  where user_id = target_user_id;
$$;

CREATE OR REPLACE FUNCTION "public"."get_my_credits"() RETURNS TABLE("plan_id" "text", "plan_name" "text", "monthly_credits" integer, "balance" integer, "credit_renewal_period" "text", "max_listing_photos" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select p.id, p.name, p.monthly_credits,
    case when p.monthly_credits is null then null
         else public.get_credit_balance(auth.uid())
    end as balance,
    p.credit_renewal_period,
    p.max_listing_photos
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION "public"."get_my_lucky_numbers"() RETURNS TABLE("campaign_id" "uuid", "campaign_name" "text", "lucky_number" integer, "ends_at" timestamp with time zone, "drawn_at" timestamp with time zone, "is_winner" boolean, "contact_user_id" "uuid")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    c.id,
    c.name,
    r.lucky_number,
    c.ends_at,
    c.drawn_at,
    c.drawn_at is not null and c.winning_number = r.lucky_number,
    c.contact_user_id
  from public.promo_redemptions r
  join public.promo_campaigns c on c.id = r.campaign_id
  where r.user_id = auth.uid() and r.lucky_number is not null
  order by r.redeemed_at desc;
$$;

CREATE OR REPLACE FUNCTION "public"."get_plan_credit_balance"("target_user_id" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select greatest(0, coalesce(sum(amount), 0))::integer
  from public.credit_ledger
  where user_id = target_user_id
    and reason in ('monthly_grant', 'weekly_grant', 'identification', 'diagnosis', 'growth_check', 'chat_question');
$$;

CREATE OR REPLACE FUNCTION "public"."get_xp_balance"("target_user_id" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(sum(amount), 0)::integer
  from public.xp_ledger
  where user_id = target_user_id;
$$;

CREATE OR REPLACE FUNCTION "public"."grant_badge"("p_user_id" "uuid", "p_badge_id" "text", "p_source" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.user_badges (user_id, badge_id, source)
  values (p_user_id, p_badge_id, p_source)
  on conflict (user_id, badge_id) do nothing;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."grant_badge_on_proposal_accepted"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_badge_id text;
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    select public.listing_badge_id(listing_type) into v_badge_id
    from public.plant_listings
    where id = new.listing_id;

    if v_badge_id is not null then
      perform public.grant_badge(new.sender_id, v_badge_id, 'proposal_accepted');
      perform public.grant_badge(new.recipient_id, v_badge_id, 'proposal_accepted');
    end if;
  end if;

  return new;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."grant_credits"("target_user_id" "uuid", "credit_amount" integer, "grant_reason" "text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if credit_amount <= 0 then
    raise exception 'credit_amount must be positive';
  end if;

  insert into public.credit_ledger (user_id, amount, reason)
  values (target_user_id, credit_amount, grant_reason);

  return public.get_credit_balance(target_user_id);
end;
$$;

CREATE OR REPLACE FUNCTION "public"."grant_species_badge"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  matched_badge_id text;
begin
  select id into matched_badge_id
  from public.badges
  where scientific_name = new.species
  limit 1;

  if matched_badge_id is not null then
    perform public.grant_badge(new.user_id, matched_badge_id, 'garden_add');
  end if;

  return new;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."grant_streak_badges"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  streak_length integer;
begin
  streak_length := public.current_care_streak(new.user_id, new.completed_date);

  if streak_length = 7 then
    perform public.grant_badge(new.user_id, 'streak-7-dias', 'care_streak');
  elsif streak_length = 30 then
    perform public.grant_badge(new.user_id, 'streak-30-dias', 'care_streak');
  end if;

  return new;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."grant_trade_badge"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    perform public.grant_badge(new.user_id, public.listing_badge_id(new.listing_type), 'listing_completed');
  end if;

  return new;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."handle_chat_message_created_push"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  perform net.http_post(
    url := 'https://qjooaimeitfrlficipgp.supabase.co/functions/v1/send-chat-message-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'notification_push_secret')
    ),
    body := jsonb_build_object('messageId', new.id)
  );
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."handle_new_comment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  post_owner uuid;
begin
  select user_id into post_owner from public.posts where id = new.post_id;

  if post_owner != new.user_id then
    insert into public.notifications (user_id, actor_id, type, post_id)
    values (post_owner, new.user_id, 'comment', new.post_id);
  end if;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."handle_new_like"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  post_owner uuid;
begin
  select user_id into post_owner from public.posts where id = new.post_id;

  if post_owner != new.user_id then
    insert into public.notifications (user_id, actor_id, type, post_id)
    values (post_owner, new.user_id, 'like', new.post_id);
  end if;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."handle_new_listing_proposal"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.notifications (user_id, actor_id, type, listing_id)
  values (new.recipient_id, new.sender_id, 'listing_interest', new.listing_id);

  return new;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  base_username text;
  final_username text;
  suffix integer := 0;
begin
  if new.raw_user_meta_data->>'username' is not null then
    final_username := new.raw_user_meta_data->>'username';
  else
    base_username := regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9_]', '', 'g');
    if base_username !~ '^[a-z]' then
      base_username := 'user_' || base_username;
    end if;
    base_username := left(base_username, 20);

    final_username := base_username;
    while exists (select 1 from public.profiles where username = final_username) loop
      suffix := suffix + 1;
      final_username := left(base_username, 19 - length(suffix::text)) || '_' || suffix;
    end loop;
  end if;

  insert into public.profiles (id, name, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    final_username,
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  );
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."handle_new_user_subscription"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_free_credits integer;
begin
  insert into public.subscriptions (user_id, plan_id, status)
  values (new.id, 'free', 'active');

  select monthly_credits into v_free_credits from public.plans where id = 'free';

  insert into public.credit_ledger (user_id, amount, reason)
  values (new.id, v_free_credits, 'monthly_grant');

  return new;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."handle_notification_created_push"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if new.type = 'care_reminder' then
    return new;
  end if;

  perform net.http_post(
    url := 'https://qjooaimeitfrlficipgp.supabase.co/functions/v1/send-notification-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'notification_push_secret')
    ),
    body := jsonb_build_object('notificationId', new.id)
  );
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."has_unread_conversations"() RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
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

CREATE OR REPLACE FUNCTION "public"."hide_conversation"("p_other_user_id" "uuid") RETURNS "void"
    LANGUAGE "sql"
    SET "search_path" TO 'public'
    AS $$
  insert into public.chat_reads (user_id, other_user_id, hidden_before)
  values (auth.uid(), p_other_user_id, now())
  on conflict (user_id, other_user_id) do update set hidden_before = now();
$$;

CREATE OR REPLACE FUNCTION "public"."listing_badge_id"("p_listing_type" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select case p_listing_type
    when 'exchange' then 'primeira-troca'
    when 'sale' then 'primeira-venda'
    else 'primeira-doacao'
  end;
$$;

CREATE OR REPLACE FUNCTION "public"."mark_badges_celebrated"("p_badge_ids" "text"[]) RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  update public.user_badges
  set celebrated_at = now()
  where user_id = auth.uid() and badge_id = any(p_badge_ids) and celebrated_at is null;
$$;

CREATE OR REPLACE FUNCTION "public"."mark_conversation_read"("p_other_user_id" "uuid") RETURNS "void"
    LANGUAGE "sql"
    SET "search_path" TO 'public'
    AS $$
  insert into public.chat_reads (user_id, other_user_id, last_read_at)
  values (auth.uid(), p_other_user_id, now())
  on conflict (user_id, other_user_id) do update set last_read_at = now();
$$;

CREATE OR REPLACE FUNCTION "public"."prevent_attendance_on_closed_event"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_event_date timestamptz;
  v_status text;
begin
  select event_date, status into v_event_date, v_status
  from public.events
  where id = new.event_id;

  if v_status = 'cancelled' then
    raise exception 'Não é possível confirmar presença em um evento cancelado.';
  end if;

  if v_event_date < now() then
    raise exception 'Não é possível confirmar presença em um evento que já aconteceu.';
  end if;

  return new;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."redeem_promo_code"("p_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_code public.promo_codes;
  v_campaign public.promo_campaigns;
  v_position integer;
  v_lucky_number integer;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_code from public.promo_codes where code = upper(trim(p_code));
  if not found then
    raise exception 'invalid_code';
  end if;

  select * into v_campaign from public.promo_campaigns where id = v_code.campaign_id;

  if now() < v_campaign.starts_at or (v_campaign.ends_at is not null and now() > v_campaign.ends_at) then
    raise exception 'expired_code';
  end if;

  if exists (select 1 from public.promo_redemptions where campaign_id = v_campaign.id and user_id = v_user_id) then
    raise exception 'already_redeemed';
  end if;

  if v_code.max_uses is not null then
    update public.promo_codes set uses = uses + 1 where code = v_code.code and uses < max_uses;
    if not found then
      raise exception 'code_exhausted';
    end if;
  end if;

  update public.promo_campaigns
  set redemption_count = redemption_count + 1
  where id = v_campaign.id and (max_redemptions is null or redemption_count < max_redemptions)
  returning redemption_count into v_position;
  if v_position is null then
    raise exception 'code_exhausted';
  end if;

  if v_campaign.has_raffle then
    v_lucky_number := v_position;
  end if;

  begin
    insert into public.promo_redemptions (campaign_id, code, user_id, credits, lucky_number)
    values (v_campaign.id, v_code.code, v_user_id, v_campaign.credits, v_lucky_number);
  exception when unique_violation then
    raise exception 'already_redeemed';
  end;

  if v_campaign.credits > 0 then
    insert into public.credit_ledger (user_id, amount, reason)
    values (v_user_id, v_campaign.credits, 'promo_code');
  end if;

  return jsonb_build_object(
    'campaignName', v_campaign.name,
    'credits', v_campaign.credits,
    'luckyNumber', v_lucky_number,
    'creditBalance', public.get_credit_balance(v_user_id)
  );
end;
$$;

CREATE OR REPLACE FUNCTION "public"."register_push_token"("p_token" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  delete from public.push_tokens where token = p_token and user_id <> auth.uid();

  insert into public.push_tokens (user_id, token)
  values (auth.uid(), p_token)
  on conflict (token) do nothing;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."renew_all_subscriptions"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  sub record;
BEGIN
  FOR sub IN
    SELECT s.id AS subscription_id, s.user_id, p.monthly_credits
    FROM public.subscriptions s
    JOIN public.plans p ON p.id = s.plan_id
    WHERE p.credit_renewal_period = 'weekly'
      AND p.monthly_credits IS NOT NULL
      AND s.last_renewal_at <= now() - interval '7 days'
      AND (
        s.status = 'active'
        OR (s.status = 'canceled' AND (s.current_period_end IS NULL OR s.current_period_end > now()))
      )
  LOOP
    PERFORM public.reset_credits_to_plan(sub.user_id, sub.monthly_credits, 'weekly_grant');

    UPDATE public.subscriptions
    SET last_renewal_at = now()
    WHERE id = sub.subscription_id;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."reset_credits_to_plan"("target_user_id" "uuid", "target_balance" integer, "grant_reason" "text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_diff integer;
begin
  v_diff := greatest(0, target_balance - public.get_plan_credit_balance(target_user_id));

  if v_diff > 0 then
    insert into public.credit_ledger (user_id, amount, reason)
    values (target_user_id, v_diff, grant_reason);
  end if;

  return public.get_credit_balance(target_user_id);
end;
$$;

CREATE TABLE IF NOT EXISTS "public"."plant_species_info" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "scientific_name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "watering_days_min" integer NOT NULL,
    "watering_days_max" integer NOT NULL,
    "sun_level" "text" NOT NULL,
    "care_level" "text" NOT NULL,
    "toxic_to_pets" boolean NOT NULL,
    "toxic_to_pets_notes" "text",
    "toxic_to_humans" boolean NOT NULL,
    "toxic_to_humans_notes" "text",
    "fun_facts" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "common_problems" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "origin" "text",
    "source" "text" DEFAULT 'openai'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reference_photos" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "common_names" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "family" "text",
    "plant_type" "text" NOT NULL,
    "light_tip" "text" NOT NULL,
    "watering_tip" "text" NOT NULL,
    "humidity_level" "text" NOT NULL,
    "humidity_tip" "text" NOT NULL,
    "temperature_min_c" smallint NOT NULL,
    "temperature_max_c" smallint NOT NULL,
    "soil_tip" "text" NOT NULL,
    "fertilizing_tip" "text" NOT NULL,
    "mature_size" "text" NOT NULL,
    "growth_rate" "text" NOT NULL,
    "propagation_methods" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "content_version" integer NOT NULL,
    CONSTRAINT "plant_species_info_care_level_check" CHECK (("care_level" = ANY (ARRAY['easy'::"text", 'moderate'::"text", 'hard'::"text"]))),
    CONSTRAINT "plant_species_info_growth_rate_check" CHECK (("growth_rate" = ANY (ARRAY['slow'::"text", 'medium'::"text", 'fast'::"text"]))),
    CONSTRAINT "plant_species_info_humidity_level_check" CHECK (("humidity_level" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text"]))),
    CONSTRAINT "plant_species_info_sun_level_check" CHECK (("sun_level" = ANY (ARRAY['shade'::"text", 'partial_shade'::"text", 'medium'::"text", 'bright_indirect'::"text", 'full_sun'::"text"]))),
    CONSTRAINT "plant_species_info_temperature_check" CHECK (("temperature_max_c" >= "temperature_min_c")),
    CONSTRAINT "plant_species_info_watering_days_check" CHECK ((("watering_days_min" > 0) AND ("watering_days_max" >= "watering_days_min")))
);

CREATE OR REPLACE FUNCTION "public"."search_plant_species"("search_query" "text") RETURNS SETOF "public"."plant_species_info"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  normalized_term TEXT;
BEGIN
  normalized_term := unaccent(search_query);

  RETURN QUERY
  SELECT *
  FROM plant_species_info
  WHERE
    unaccent(scientific_name) ILIKE '%' || normalized_term || '%'
    OR
    EXISTS (
      SELECT 1 FROM unnest(common_names) AS cn
      WHERE unaccent(cn) ILIKE '%' || normalized_term || '%'
    )
    OR similarity(unaccent(scientific_name), normalized_term) > 0.15
    OR EXISTS (
      SELECT 1 FROM unnest(common_names) AS cn
      WHERE similarity(unaccent(cn), normalized_term) > 0.15
    )
  ORDER BY
    GREATEST(
      CASE WHEN unaccent(scientific_name) ILIKE normalized_term || '%' THEN 1.0 ELSE 0.0 END,
      (SELECT coalesce(max(CASE WHEN unaccent(cn) ILIKE normalized_term || '%' THEN 1.0 ELSE 0.0 END), 0.0) FROM unnest(common_names) AS cn),
      
      similarity(unaccent(scientific_name), normalized_term),
      (SELECT coalesce(max(similarity(unaccent(cn), normalized_term)), 0.0) FROM unnest(common_names) AS cn)
    ) DESC
  LIMIT 10;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."send_care_setup_reminders"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  target_plant_ids uuid[];
begin
  select array_agg(p.id) into target_plant_ids
  from public.plants p
  where p.deleted_at is null
    and p.care_setup_reminder_sent_at is null
    and p.created_at <= now() - interval '24 hours'
    and not exists (
      select 1 from public.care_tasks ct
      where ct.plant_id = p.id and ct.deleted_at is null
    );

  if target_plant_ids is null then
    return;
  end if;

  insert into public.notifications (user_id, type, plant_id)
  select p.user_id, 'care_setup_reminder', p.id
  from public.plants p
  where p.id = any(target_plant_ids);

  update public.plants
  set care_setup_reminder_sent_at = now()
  where id = any(target_plant_ids);
end;
$$;

CREATE OR REPLACE FUNCTION "public"."set_proposal_responded_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if new.status <> 'pending' and old.status = 'pending' then
    new.responded_at = now();
  end if;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

CREATE TABLE IF NOT EXISTS "public"."app_versions" (
    "platform" "text" NOT NULL,
    "latest_version_code" integer NOT NULL,
    "store_url" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "app_versions_platform_check" CHECK (("platform" = ANY (ARRAY['android'::"text", 'ios'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."articles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "locale" "text" NOT NULL,
    "category" "text" NOT NULL,
    "title" "text" NOT NULL,
    "dek" "text" NOT NULL,
    "cover_url" "text",
    "reading_minutes" smallint NOT NULL,
    "body" "jsonb" NOT NULL,
    "is_featured" boolean DEFAULT false NOT NULL,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "articles_body_is_array_check" CHECK (("jsonb_typeof"("body") = 'array'::"text")),
    CONSTRAINT "articles_locale_check" CHECK (("locale" = ANY (ARRAY['pt'::"text", 'en'::"text"]))),
    CONSTRAINT "articles_reading_minutes_check" CHECK (("reading_minutes" > 0)),
    CONSTRAINT "articles_slug_format_check" CHECK (("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::"text"))
);

CREATE TABLE IF NOT EXISTS "public"."badge_batches" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."badges" (
    "id" "text" NOT NULL,
    "batch_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "pixel_art" "jsonb" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "scientific_name" "text"
);

CREATE TABLE IF NOT EXISTS "public"."care_task_completions" (
    "user_id" "uuid" NOT NULL,
    "completed_date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."care_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "plant_id" "uuid",
    "title" "text" NOT NULL,
    "plant_name" "text",
    "plant_photo_url" "text",
    "category" "text" NOT NULL,
    "notes" "text",
    "start_date" "date" NOT NULL,
    "recurrence_days" integer,
    "reminder_hour" integer DEFAULT 9 NOT NULL,
    "last_completed_occurrence" "date",
    "last_reminded_occurrence" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reminder_minute" integer DEFAULT 0 NOT NULL,
    "deleted_at" timestamp with time zone,
    "device_calendar_event_id" "text",
    CONSTRAINT "care_tasks_recurrence_days_check" CHECK ((("recurrence_days" IS NULL) OR ("recurrence_days" > 0))),
    CONSTRAINT "care_tasks_reminder_hour_check" CHECK ((("reminder_hour" >= 0) AND ("reminder_hour" <= 23))),
    CONSTRAINT "care_tasks_reminder_minute_check" CHECK ((("reminder_minute" >= 0) AND ("reminder_minute" <= 59)))
);

CREATE TABLE IF NOT EXISTS "public"."chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sender_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "body" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "photo_url" "text",
    CONSTRAINT "chat_messages_content_check" CHECK ((("body" IS NOT NULL) OR ("photo_url" IS NOT NULL))),
    CONSTRAINT "plant_listing_messages_check" CHECK (("recipient_id" <> "sender_id"))
);

CREATE TABLE IF NOT EXISTS "public"."chat_reads" (
    "user_id" "uuid" NOT NULL,
    "other_user_id" "uuid" NOT NULL,
    "last_read_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "hidden_before" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "public"."content_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reporter_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "post_id" "uuid",
    "comment_id" "uuid",
    "reason" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "content_reports_reason_check" CHECK (("reason" = ANY (ARRAY['spam'::"text", 'inappropriate'::"text", 'scam'::"text", 'other'::"text"]))),
    CONSTRAINT "content_reports_single_target_check" CHECK (("num_nonnulls"("post_id", "comment_id") = 1))
);

CREATE TABLE IF NOT EXISTS "public"."credit_costs" (
    "reason" "text" NOT NULL,
    "cost" integer NOT NULL,
    CONSTRAINT "credit_costs_cost_check" CHECK (("cost" > 0))
);

CREATE TABLE IF NOT EXISTS "public"."credit_ledger" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" integer NOT NULL,
    "reason" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "credit_ledger_reason_check" CHECK (("reason" = ANY (ARRAY['signup_bonus'::"text", 'plan_upgrade'::"text", 'manual_adjustment'::"text", 'identification'::"text", 'diagnosis'::"text", 'growth_check'::"text", 'chat_question'::"text", 'boost_content'::"text", 'weekly_renewal'::"text", 'weekly_grant'::"text", 'monthly_grant'::"text", 'purchase'::"text", 'promo_code'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."credit_packs" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "credits" integer NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "credit_packs_credits_check" CHECK (("credits" > 0))
);

CREATE TABLE IF NOT EXISTS "public"."event_attendees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "photo_url" "text",
    "event_date" timestamp with time zone NOT NULL,
    "latitude" double precision NOT NULL,
    "longitude" double precision NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "boosted_until" timestamp with time zone,
    CONSTRAINT "events_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'cancelled'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."follows" (
    "follower_id" "uuid" NOT NULL,
    "following_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "follows_check" CHECK (("follower_id" <> "following_id"))
);

CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text",
    "message" "text",
    "type" "text" DEFAULT 'system'::"text" NOT NULL,
    "post_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actor_id" "uuid",
    "listing_id" "uuid",
    "deleted_at" timestamp with time zone,
    "plant_id" "uuid",
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['system'::"text", 'like'::"text", 'comment'::"text", 'listing_interest'::"text", 'care_setup_reminder'::"text", 'care_reminder'::"text", 'promo_winner'::"text", 'promo_result'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."plans" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "monthly_credits" integer,
    "revenuecat_entitlement_id" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "credit_renewal_period" "text" DEFAULT 'monthly'::"text" NOT NULL,
    "max_listing_photos" integer,
    CONSTRAINT "plans_credit_renewal_period_check" CHECK (("credit_renewal_period" = ANY (ARRAY['weekly'::"text", 'monthly'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."plant_chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plant_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "session_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    CONSTRAINT "plant_chat_messages_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'assistant'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."plant_diagnoses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "photo_url" "text" NOT NULL,
    "health_status" "text" NOT NULL,
    "summary" "text" NOT NULL,
    "issues" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "recommended_actions" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "plant_diagnoses_health_status_check" CHECK (("health_status" = ANY (ARRAY['healthy'::"text", 'attention'::"text", 'urgent'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."plant_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "public"."plant_growth_checkins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "photo_url" "text" NOT NULL,
    "observations" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."plant_listing_proposals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "listing_id" "uuid" NOT NULL,
    "sender_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "proposal_type" "text" NOT NULL,
    "offered_plant_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "responded_at" timestamp with time zone,
    CONSTRAINT "plant_listing_proposals_check" CHECK (("recipient_id" <> "sender_id")),
    CONSTRAINT "plant_listing_proposals_check1" CHECK (((("proposal_type" = 'offer'::"text") AND ("offered_plant_id" IS NOT NULL)) OR (("proposal_type" = 'interest'::"text") AND ("offered_plant_id" IS NULL)))),
    CONSTRAINT "plant_listing_proposals_proposal_type_check" CHECK (("proposal_type" = ANY (ARRAY['offer'::"text", 'interest'::"text"]))),
    CONSTRAINT "plant_listing_proposals_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'declined'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."plant_listings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "plant_id" "uuid",
    "listing_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "latitude" double precision NOT NULL,
    "longitude" double precision NOT NULL,
    "status" "text" DEFAULT 'available'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "photo_urls" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "deleted_at" timestamp with time zone,
    "price_cents" integer,
    "boosted_until" timestamp with time zone,
    "xp_awarded_at" timestamp with time zone,
    CONSTRAINT "plant_listings_listing_type_check" CHECK (("listing_type" = ANY (ARRAY['donation'::"text", 'exchange'::"text", 'sale'::"text"]))),
    CONSTRAINT "plant_listings_photo_urls_max_check" CHECK (("cardinality"("photo_urls") <= 5)),
    CONSTRAINT "plant_listings_price_cents_check" CHECK (((("listing_type" = 'sale'::"text") AND ("price_cents" IS NOT NULL) AND ("price_cents" > 0)) OR (("listing_type" <> 'sale'::"text") AND ("price_cents" IS NULL)))),
    CONSTRAINT "plant_listings_status_check" CHECK (("status" = ANY (ARRAY['available'::"text", 'completed'::"text", 'cancelled'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."plants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "name" "text" NOT NULL,
    "species" "text",
    "common_name" "text",
    "watering_days" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "photo_urls" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "deleted_at" timestamp with time zone,
    "group_id" "uuid",
    "care_setup_reminder_sent_at" timestamp with time zone,
    CONSTRAINT "plants_photo_urls_max_check" CHECK (("cardinality"("photo_urls") <= 5)),
    CONSTRAINT "plants_watering_days_check" CHECK ((("watering_days" IS NULL) OR ("watering_days" > 0)))
);

CREATE TABLE IF NOT EXISTS "public"."post_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "text" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "photo_url" "text",
    CONSTRAINT "post_comments_content_check" CHECK ((("text" IS NOT NULL) OR ("photo_url" IS NOT NULL)))
);

CREATE TABLE IF NOT EXISTS "public"."post_likes" (
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "caption" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "post_type" "text",
    "deleted_at" timestamp with time zone,
    "listing_id" "uuid",
    "event_id" "uuid",
    "image_urls" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "boosted_until" timestamp with time zone,
    CONSTRAINT "posts_image_urls_max_check" CHECK (("cardinality"("image_urls") <= 5)),
    CONSTRAINT "posts_post_type_check" CHECK (("post_type" = ANY (ARRAY['conquista'::"text", 'duvida'::"text", 'dica'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "username" "text" NOT NULL,
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "locale" "text" DEFAULT 'pt'::"text" NOT NULL,
    CONSTRAINT "profiles_locale_check" CHECK (("locale" = ANY (ARRAY['en'::"text", 'pt'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."promo_campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "credits" integer DEFAULT 0 NOT NULL,
    "has_raffle" boolean DEFAULT false NOT NULL,
    "starts_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ends_at" timestamp with time zone,
    "max_redemptions" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "drawn_at" timestamp with time zone,
    "winning_number" integer,
    "contact_user_id" "uuid",
    "redemption_count" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "promo_campaigns_credits_check" CHECK (("credits" >= 0)),
    CONSTRAINT "promo_campaigns_max_redemptions_check" CHECK (("max_redemptions" > 0))
);

CREATE TABLE IF NOT EXISTS "public"."promo_codes" (
    "code" "text" NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "max_uses" integer,
    "uses" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "promo_codes_code_check" CHECK (("code" = "upper"("code"))),
    CONSTRAINT "promo_codes_max_uses_check" CHECK (("max_uses" > 0))
);

CREATE TABLE IF NOT EXISTS "public"."promo_redemptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "credits" integer DEFAULT 0 NOT NULL,
    "lucky_number" integer,
    "redeemed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."push_tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "text" NOT NULL,
    "token" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."push_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."revenuecat_processed_events" (
    "event_id" "text" NOT NULL,
    "processed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "transaction_id" "text"
);

CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan_id" "text" DEFAULT 'free'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "provider" "text",
    "provider_customer_id" "text",
    "current_period_end" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_renewal_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'trialing'::"text", 'canceled'::"text", 'expired'::"text", 'past_due'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."user_badges" (
    "user_id" "uuid" NOT NULL,
    "badge_id" "text" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source" "text" NOT NULL,
    "celebrated_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "public"."xp_ledger" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" integer NOT NULL,
    "reason" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "xp_ledger_reason_check" CHECK (("reason" = ANY (ARRAY['care_task_completed'::"text", 'community_post_created'::"text", 'community_comment_created'::"text", 'listing_completed'::"text", 'plant_added'::"text", 'plant_identified'::"text"])))
);

ALTER TABLE ONLY "public"."app_versions"
    ADD CONSTRAINT "app_versions_pkey" PRIMARY KEY ("platform");

ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_locale_slug_key" UNIQUE ("locale", "slug");

ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."badge_batches"
    ADD CONSTRAINT "badge_batches_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."badges"
    ADD CONSTRAINT "badges_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."care_task_completions"
    ADD CONSTRAINT "care_task_completions_pkey" PRIMARY KEY ("user_id", "completed_date");

ALTER TABLE ONLY "public"."care_tasks"
    ADD CONSTRAINT "care_tasks_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."chat_reads"
    ADD CONSTRAINT "chat_reads_pkey" PRIMARY KEY ("user_id", "other_user_id");

ALTER TABLE ONLY "public"."content_reports"
    ADD CONSTRAINT "content_reports_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."credit_costs"
    ADD CONSTRAINT "credit_costs_pkey" PRIMARY KEY ("reason");

ALTER TABLE ONLY "public"."credit_ledger"
    ADD CONSTRAINT "credit_ledger_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."credit_packs"
    ADD CONSTRAINT "credit_packs_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."event_attendees"
    ADD CONSTRAINT "event_attendees_event_id_user_id_key" UNIQUE ("event_id", "user_id");

ALTER TABLE ONLY "public"."event_attendees"
    ADD CONSTRAINT "event_attendees_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_pkey" PRIMARY KEY ("follower_id", "following_id");

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."plant_chat_messages"
    ADD CONSTRAINT "plant_chat_messages_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."plant_diagnoses"
    ADD CONSTRAINT "plant_diagnoses_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."plant_groups"
    ADD CONSTRAINT "plant_groups_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."plant_growth_checkins"
    ADD CONSTRAINT "plant_growth_checkins_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "plant_listing_messages_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."plant_listing_proposals"
    ADD CONSTRAINT "plant_listing_proposals_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."plant_listings"
    ADD CONSTRAINT "plant_listings_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."plant_species_info"
    ADD CONSTRAINT "plant_species_info_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."plant_species_info"
    ADD CONSTRAINT "plant_species_info_scientific_name_key" UNIQUE ("scientific_name");

ALTER TABLE ONLY "public"."plants"
    ADD CONSTRAINT "plants_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."post_comments"
    ADD CONSTRAINT "post_comments_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_pkey" PRIMARY KEY ("post_id", "user_id");

ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");

ALTER TABLE ONLY "public"."promo_campaigns"
    ADD CONSTRAINT "promo_campaigns_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."promo_codes"
    ADD CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("code");

ALTER TABLE ONLY "public"."promo_redemptions"
    ADD CONSTRAINT "promo_redemptions_campaign_id_lucky_number_key" UNIQUE ("campaign_id", "lucky_number");

ALTER TABLE ONLY "public"."promo_redemptions"
    ADD CONSTRAINT "promo_redemptions_campaign_id_user_id_key" UNIQUE ("campaign_id", "user_id");

ALTER TABLE ONLY "public"."promo_redemptions"
    ADD CONSTRAINT "promo_redemptions_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."push_tickets"
    ADD CONSTRAINT "push_tickets_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."push_tickets"
    ADD CONSTRAINT "push_tickets_ticket_id_key" UNIQUE ("ticket_id");

ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_token_key" UNIQUE ("token");

ALTER TABLE ONLY "public"."revenuecat_processed_events"
    ADD CONSTRAINT "revenuecat_processed_events_pkey" PRIMARY KEY ("event_id");

ALTER TABLE ONLY "public"."revenuecat_processed_events"
    ADD CONSTRAINT "revenuecat_processed_events_transaction_id_key" UNIQUE ("transaction_id");

ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_key" UNIQUE ("user_id");

ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_pkey" PRIMARY KEY ("user_id", "badge_id");

ALTER TABLE ONLY "public"."xp_ledger"
    ADD CONSTRAINT "xp_ledger_pkey" PRIMARY KEY ("id");

CREATE INDEX "articles_locale_published_at_idx" ON "public"."articles" USING "btree" ("locale", "published_at" DESC);

CREATE INDEX "badges_batch_id_idx" ON "public"."badges" USING "btree" ("batch_id");

CREATE INDEX "care_tasks_plant_id_idx" ON "public"."care_tasks" USING "btree" ("plant_id");

CREATE INDEX "care_tasks_user_id_idx" ON "public"."care_tasks" USING "btree" ("user_id");

CREATE UNIQUE INDEX "content_reports_comment_reporter_key" ON "public"."content_reports" USING "btree" ("comment_id", "reporter_id") WHERE ("comment_id" IS NOT NULL);

CREATE UNIQUE INDEX "content_reports_post_reporter_key" ON "public"."content_reports" USING "btree" ("post_id", "reporter_id") WHERE ("post_id" IS NOT NULL);

CREATE INDEX "content_reports_reporter_id_idx" ON "public"."content_reports" USING "btree" ("reporter_id");

CREATE INDEX "credit_ledger_user_id_idx" ON "public"."credit_ledger" USING "btree" ("user_id");

CREATE INDEX "event_attendees_event_id_idx" ON "public"."event_attendees" USING "btree" ("event_id");

CREATE INDEX "events_event_date_idx" ON "public"."events" USING "btree" ("event_date");

CREATE INDEX "events_user_id_idx" ON "public"."events" USING "btree" ("user_id");

CREATE INDEX "follows_following_id_idx" ON "public"."follows" USING "btree" ("following_id");

CREATE INDEX "notifications_actor_id_idx" ON "public"."notifications" USING "btree" ("actor_id");

CREATE INDEX "notifications_post_id_idx" ON "public"."notifications" USING "btree" ("post_id");

CREATE INDEX "plant_chat_messages_session_id_idx" ON "public"."plant_chat_messages" USING "btree" ("plant_id", "session_id", "created_at");

CREATE INDEX "plant_diagnoses_user_id_idx" ON "public"."plant_diagnoses" USING "btree" ("user_id", "created_at" DESC);

CREATE INDEX "plant_groups_user_id_idx" ON "public"."plant_groups" USING "btree" ("user_id");

CREATE INDEX "plant_growth_checkins_plant_id_idx" ON "public"."plant_growth_checkins" USING "btree" ("plant_id", "created_at");

CREATE INDEX "plant_listing_proposals_listing_id_idx" ON "public"."plant_listing_proposals" USING "btree" ("listing_id");

CREATE UNIQUE INDEX "plant_listing_proposals_one_per_sender_idx" ON "public"."plant_listing_proposals" USING "btree" ("listing_id", "sender_id", "proposal_type");

CREATE INDEX "plant_listings_status_idx" ON "public"."plant_listings" USING "btree" ("status");

CREATE INDEX "plant_listings_user_id_idx" ON "public"."plant_listings" USING "btree" ("user_id");

CREATE INDEX "plants_group_id_idx" ON "public"."plants" USING "btree" ("group_id");

CREATE INDEX "plants_user_id_idx" ON "public"."plants" USING "btree" ("user_id");

CREATE INDEX "post_comments_post_id_idx" ON "public"."post_comments" USING "btree" ("post_id") WHERE ("deleted_at" IS NULL);

CREATE INDEX "posts_feed_idx" ON "public"."posts" USING "btree" ("created_at" DESC) WHERE ("deleted_at" IS NULL);

CREATE INDEX "posts_user_id_idx" ON "public"."posts" USING "btree" ("user_id");

CREATE INDEX "profiles_username_trgm_idx" ON "public"."profiles" USING "gin" ("username" "public"."gin_trgm_ops");

CREATE INDEX "promo_codes_campaign_id_idx" ON "public"."promo_codes" USING "btree" ("campaign_id");

CREATE INDEX "promo_redemptions_code_idx" ON "public"."promo_redemptions" USING "btree" ("code");

CREATE INDEX "promo_redemptions_user_id_idx" ON "public"."promo_redemptions" USING "btree" ("user_id");

CREATE INDEX "push_tickets_created_at_idx" ON "public"."push_tickets" USING "btree" ("created_at");

CREATE INDEX "push_tokens_user_id_idx" ON "public"."push_tokens" USING "btree" ("user_id");

CREATE INDEX "user_badges_user_id_idx" ON "public"."user_badges" USING "btree" ("user_id");

CREATE INDEX "xp_ledger_user_id_idx" ON "public"."xp_ledger" USING "btree" ("user_id");

CREATE INDEX "xp_ledger_user_reason_created_idx" ON "public"."xp_ledger" USING "btree" ("user_id", "reason", "created_at");

CREATE OR REPLACE TRIGGER "app_versions_set_updated_at" BEFORE UPDATE ON "public"."app_versions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE TRIGGER "award_xp_after_care_completion" AFTER INSERT ON "public"."care_task_completions" FOR EACH ROW EXECUTE FUNCTION "public"."award_xp_for_care_completion"();

CREATE OR REPLACE TRIGGER "award_xp_after_comment_insert" AFTER INSERT ON "public"."post_comments" FOR EACH ROW EXECUTE FUNCTION "public"."award_xp_for_new_comment"();

CREATE OR REPLACE TRIGGER "award_xp_after_listing_completed" BEFORE UPDATE ON "public"."plant_listings" FOR EACH ROW EXECUTE FUNCTION "public"."award_xp_for_completed_listing"();

CREATE OR REPLACE TRIGGER "award_xp_after_plant_insert" AFTER INSERT ON "public"."plants" FOR EACH ROW EXECUTE FUNCTION "public"."award_xp_for_new_plant"();

CREATE OR REPLACE TRIGGER "award_xp_after_post_insert" AFTER INSERT ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "public"."award_xp_for_new_post"();

CREATE OR REPLACE TRIGGER "grant_badge_after_proposal_accepted" AFTER UPDATE OF "status" ON "public"."plant_listing_proposals" FOR EACH ROW EXECUTE FUNCTION "public"."grant_badge_on_proposal_accepted"();

CREATE OR REPLACE TRIGGER "grant_species_badge_on_plant_insert" AFTER INSERT ON "public"."plants" FOR EACH ROW EXECUTE FUNCTION "public"."grant_species_badge"();

CREATE OR REPLACE TRIGGER "grant_streak_badges_on_completion" AFTER INSERT ON "public"."care_task_completions" FOR EACH ROW EXECUTE FUNCTION "public"."grant_streak_badges"();

CREATE OR REPLACE TRIGGER "grant_trade_badge_on_listing_completed" AFTER UPDATE ON "public"."plant_listings" FOR EACH ROW EXECUTE FUNCTION "public"."grant_trade_badge"();

CREATE OR REPLACE TRIGGER "on_chat_message_created_push" AFTER INSERT ON "public"."chat_messages" FOR EACH ROW EXECUTE FUNCTION "public"."handle_chat_message_created_push"();

CREATE OR REPLACE TRIGGER "on_comment_created" AFTER INSERT ON "public"."post_comments" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_comment"();

CREATE OR REPLACE TRIGGER "on_like_created" AFTER INSERT ON "public"."post_likes" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_like"();

CREATE OR REPLACE TRIGGER "on_listing_proposal_created" AFTER INSERT ON "public"."plant_listing_proposals" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_listing_proposal"();

CREATE OR REPLACE TRIGGER "on_notification_created_push" AFTER INSERT ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."handle_notification_created_push"();

CREATE OR REPLACE TRIGGER "on_plant_group_soft_delete" AFTER UPDATE ON "public"."plant_groups" FOR EACH ROW EXECUTE FUNCTION "public"."cascade_plant_group_soft_delete"();

CREATE OR REPLACE TRIGGER "on_plant_soft_delete" AFTER UPDATE ON "public"."plants" FOR EACH ROW EXECUTE FUNCTION "public"."cascade_plant_soft_delete"();

CREATE OR REPLACE TRIGGER "on_post_soft_deleted" AFTER UPDATE ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "public"."cascade_soft_delete_comments"();

CREATE OR REPLACE TRIGGER "on_proposal_status_changed" BEFORE UPDATE ON "public"."plant_listing_proposals" FOR EACH ROW EXECUTE FUNCTION "public"."set_proposal_responded_at"();

CREATE OR REPLACE TRIGGER "plant_species_info_set_updated_at" BEFORE UPDATE ON "public"."plant_species_info" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE TRIGGER "plants_set_updated_at" BEFORE UPDATE ON "public"."plants" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE TRIGGER "post_comments_set_updated_at" BEFORE UPDATE ON "public"."post_comments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE TRIGGER "posts_set_updated_at" BEFORE UPDATE ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE TRIGGER "prevent_attendance_on_closed_event_trigger" BEFORE INSERT ON "public"."event_attendees" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_attendance_on_closed_event"();

CREATE OR REPLACE TRIGGER "profiles_set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE TRIGGER "subscriptions_set_updated_at" BEFORE UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

ALTER TABLE ONLY "public"."badges"
    ADD CONSTRAINT "badges_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."badge_batches"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."care_task_completions"
    ADD CONSTRAINT "care_task_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."care_tasks"
    ADD CONSTRAINT "care_tasks_plant_id_fkey" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."care_tasks"
    ADD CONSTRAINT "care_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."chat_reads"
    ADD CONSTRAINT "chat_reads_other_user_id_fkey" FOREIGN KEY ("other_user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."chat_reads"
    ADD CONSTRAINT "chat_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."content_reports"
    ADD CONSTRAINT "content_reports_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."post_comments"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."content_reports"
    ADD CONSTRAINT "content_reports_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."content_reports"
    ADD CONSTRAINT "content_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."credit_ledger"
    ADD CONSTRAINT "credit_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."event_attendees"
    ADD CONSTRAINT "event_attendees_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."event_attendees"
    ADD CONSTRAINT "event_attendees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."plant_listings"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_plant_id_fkey" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."plant_chat_messages"
    ADD CONSTRAINT "plant_chat_messages_plant_id_fkey" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."plant_chat_messages"
    ADD CONSTRAINT "plant_chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."plant_diagnoses"
    ADD CONSTRAINT "plant_diagnoses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."plant_groups"
    ADD CONSTRAINT "plant_groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."plant_growth_checkins"
    ADD CONSTRAINT "plant_growth_checkins_plant_id_fkey" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."plant_growth_checkins"
    ADD CONSTRAINT "plant_growth_checkins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "plant_listing_messages_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "plant_listing_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."plant_listing_proposals"
    ADD CONSTRAINT "plant_listing_proposals_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."plant_listings"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."plant_listing_proposals"
    ADD CONSTRAINT "plant_listing_proposals_offered_plant_id_fkey" FOREIGN KEY ("offered_plant_id") REFERENCES "public"."plants"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."plant_listing_proposals"
    ADD CONSTRAINT "plant_listing_proposals_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."plant_listing_proposals"
    ADD CONSTRAINT "plant_listing_proposals_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."plant_listings"
    ADD CONSTRAINT "plant_listings_plant_id_fkey" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."plant_listings"
    ADD CONSTRAINT "plant_listings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."plants"
    ADD CONSTRAINT "plants_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."plant_groups"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."plants"
    ADD CONSTRAINT "plants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."post_comments"
    ADD CONSTRAINT "post_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."post_comments"
    ADD CONSTRAINT "post_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."plant_listings"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."promo_campaigns"
    ADD CONSTRAINT "promo_campaigns_contact_user_id_fkey" FOREIGN KEY ("contact_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."promo_codes"
    ADD CONSTRAINT "promo_codes_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."promo_campaigns"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."promo_redemptions"
    ADD CONSTRAINT "promo_redemptions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."promo_campaigns"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."promo_redemptions"
    ADD CONSTRAINT "promo_redemptions_code_fkey" FOREIGN KEY ("code") REFERENCES "public"."promo_codes"("code") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."promo_redemptions"
    ADD CONSTRAINT "promo_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id");

ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."xp_ledger"
    ADD CONSTRAINT "xp_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

CREATE POLICY "Anyone can read published articles" ON "public"."articles" FOR SELECT TO "authenticated", "anon" USING ((("published_at" IS NOT NULL) AND ("published_at" <= "now"())));

CREATE POLICY "Anyone can view available or completed listings" ON "public"."plant_listings" FOR SELECT USING (((("deleted_at" IS NULL) AND ("status" = ANY (ARRAY['available'::"text", 'completed'::"text"]))) OR ("user_id" = "auth"."uid"())));

CREATE POLICY "Anyone can view badge batches" ON "public"."badge_batches" FOR SELECT USING (true);

CREATE POLICY "Anyone can view badges" ON "public"."badges" FOR SELECT USING (true);

CREATE POLICY "Anyone can view credit costs" ON "public"."credit_costs" FOR SELECT USING (true);

CREATE POLICY "Anyone can view credit packs" ON "public"."credit_packs" FOR SELECT USING (true);

CREATE POLICY "Anyone can view event attendees" ON "public"."event_attendees" FOR SELECT USING (true);

CREATE POLICY "Anyone can view events" ON "public"."events" FOR SELECT USING ((("deleted_at" IS NULL) OR ("user_id" = "auth"."uid"())));

CREATE POLICY "Anyone can view plans" ON "public"."plans" FOR SELECT USING (true);

CREATE POLICY "Anyone can view plant species info" ON "public"."plant_species_info" FOR SELECT USING (true);

CREATE POLICY "Anyone can view user badges" ON "public"."user_badges" FOR SELECT USING (true);

CREATE POLICY "App versions are publicly readable" ON "public"."app_versions" FOR SELECT USING (true);

CREATE POLICY "Follows are viewable by everyone" ON "public"."follows" FOR SELECT USING (true);

CREATE POLICY "Participants can send listing messages" ON "public"."chat_messages" FOR INSERT WITH CHECK (("sender_id" = "auth"."uid"()));

CREATE POLICY "Participants can view their listing messages" ON "public"."chat_messages" FOR SELECT USING ((("sender_id" = "auth"."uid"()) OR ("recipient_id" = "auth"."uid"())));

CREATE POLICY "Participants can view their proposals" ON "public"."plant_listing_proposals" FOR SELECT USING ((("sender_id" = "auth"."uid"()) OR ("recipient_id" = "auth"."uid"())));

CREATE POLICY "Plants are viewable by everyone" ON "public"."plants" FOR SELECT USING (true);

CREATE POLICY "Post comments are viewable by everyone" ON "public"."post_comments" FOR SELECT USING ((("deleted_at" IS NULL) OR ("auth"."uid"() = "user_id")));

CREATE POLICY "Post likes are viewable by everyone" ON "public"."post_likes" FOR SELECT USING (true);

CREATE POLICY "Posts are viewable by everyone" ON "public"."posts" FOR SELECT USING ((("deleted_at" IS NULL) OR ("auth"."uid"() = "user_id")));

CREATE POLICY "Public profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);

CREATE POLICY "Recipients can respond to proposals" ON "public"."plant_listing_proposals" FOR UPDATE USING (("recipient_id" = "auth"."uid"())) WITH CHECK (("recipient_id" = "auth"."uid"()));

CREATE POLICY "Users can cancel their own attendance" ON "public"."event_attendees" FOR DELETE USING (("user_id" = "auth"."uid"()));

CREATE POLICY "Users can confirm their own attendance" ON "public"."event_attendees" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));

CREATE POLICY "Users can delete their own care tasks" ON "public"."care_tasks" FOR DELETE USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can delete their own diagnoses" ON "public"."plant_diagnoses" FOR DELETE USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can delete their own events" ON "public"."events" FOR DELETE USING (("user_id" = "auth"."uid"()));

CREATE POLICY "Users can delete their own growth checkins" ON "public"."plant_growth_checkins" FOR DELETE USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can delete their own listings" ON "public"."plant_listings" FOR DELETE USING (("user_id" = "auth"."uid"()));

CREATE POLICY "Users can delete their own notifications" ON "public"."notifications" FOR DELETE USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can delete their own plant groups" ON "public"."plant_groups" FOR DELETE USING (("user_id" = "auth"."uid"()));

CREATE POLICY "Users can delete their own plants" ON "public"."plants" FOR DELETE USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can delete their own push tokens" ON "public"."push_tokens" FOR DELETE USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can follow others" ON "public"."follows" FOR INSERT WITH CHECK (("auth"."uid"() = "follower_id"));

CREATE POLICY "Users can insert their own care task completions" ON "public"."care_task_completions" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND ("completed_date" = CURRENT_DATE)));

CREATE POLICY "Users can insert their own care tasks" ON "public"."care_tasks" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can insert their own chat reads" ON "public"."chat_reads" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));

CREATE POLICY "Users can insert their own comments" ON "public"."post_comments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can insert their own diagnoses" ON "public"."plant_diagnoses" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can insert their own events" ON "public"."events" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));

CREATE POLICY "Users can insert their own growth checkins" ON "public"."plant_growth_checkins" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can insert their own listings" ON "public"."plant_listings" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));

CREATE POLICY "Users can insert their own plant chat messages" ON "public"."plant_chat_messages" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND (("plant_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."plants"
  WHERE (("plants"."id" = "plant_chat_messages"."plant_id") AND ("plants"."user_id" = "auth"."uid"())))))));

CREATE POLICY "Users can insert their own plant groups" ON "public"."plant_groups" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));

CREATE POLICY "Users can insert their own plants" ON "public"."plants" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND (("group_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."plant_groups"
  WHERE (("plant_groups"."id" = "plants"."group_id") AND ("plant_groups"."user_id" = "auth"."uid"())))))));

CREATE POLICY "Users can insert their own posts" ON "public"."posts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));

CREATE POLICY "Users can insert their own push tokens" ON "public"."push_tokens" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can like posts" ON "public"."post_likes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can report content" ON "public"."content_reports" FOR INSERT TO "authenticated" WITH CHECK (("reporter_id" = ( SELECT "auth"."uid"() AS "uid")));

CREATE POLICY "Users can send proposals" ON "public"."plant_listing_proposals" FOR INSERT WITH CHECK (("sender_id" = "auth"."uid"()));

CREATE POLICY "Users can unfollow others" ON "public"."follows" FOR DELETE USING (("auth"."uid"() = "follower_id"));

CREATE POLICY "Users can unlike posts" ON "public"."post_likes" FOR DELETE USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));

CREATE POLICY "Users can update their own care tasks" ON "public"."care_tasks" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can update their own chat reads" ON "public"."chat_reads" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));

CREATE POLICY "Users can update their own comments" ON "public"."post_comments" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can update their own events" ON "public"."events" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));

CREATE POLICY "Users can update their own listings" ON "public"."plant_listings" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));

CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can update their own plant groups" ON "public"."plant_groups" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));

CREATE POLICY "Users can update their own plants" ON "public"."plants" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK ((("auth"."uid"() = "user_id") AND (("group_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."plant_groups"
  WHERE (("plant_groups"."id" = "plants"."group_id") AND ("plant_groups"."user_id" = "auth"."uid"())))))));

CREATE POLICY "Users can update their own posts" ON "public"."posts" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can view their own care task completions" ON "public"."care_task_completions" FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can view their own care tasks" ON "public"."care_tasks" FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can view their own chat reads" ON "public"."chat_reads" FOR SELECT USING (("user_id" = "auth"."uid"()));

CREATE POLICY "Users can view their own credit ledger" ON "public"."credit_ledger" FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can view their own diagnoses" ON "public"."plant_diagnoses" FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can view their own growth checkins" ON "public"."plant_growth_checkins" FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can view their own plant chat messages" ON "public"."plant_chat_messages" FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can view their own plant groups" ON "public"."plant_groups" FOR SELECT USING (("user_id" = "auth"."uid"()));

CREATE POLICY "Users can view their own plants" ON "public"."plants" FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can view their own promo redemptions" ON "public"."promo_redemptions" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));

CREATE POLICY "Users can view their own push tokens" ON "public"."push_tokens" FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can view their own subscription" ON "public"."subscriptions" FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can view their own xp ledger" ON "public"."xp_ledger" FOR SELECT USING (("auth"."uid"() = "user_id"));

ALTER TABLE "public"."app_versions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."articles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."badge_batches" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."badges" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."care_task_completions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."care_tasks" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."chat_messages" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."chat_reads" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."content_reports" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."credit_costs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."credit_ledger" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."credit_packs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."event_attendees" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."follows" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."plans" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."plant_chat_messages" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."plant_diagnoses" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."plant_groups" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."plant_growth_checkins" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."plant_listing_proposals" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."plant_listings" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."plant_species_info" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."plants" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."post_comments" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."post_likes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."posts" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."promo_campaigns" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."promo_codes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."promo_redemptions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."push_tickets" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."push_tokens" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."revenuecat_processed_events" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."user_badges" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."xp_ledger" ENABLE ROW LEVEL SECURITY;

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."chat_messages";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notifications";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."plant_listing_proposals";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."post_comments";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."post_likes";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."posts";

REVOKE ALL ON FUNCTION "public"."award_capped_xp"("target_user_id" "uuid", "xp_amount" integer, "xp_reason" "text", "daily_cap" integer) FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."award_capped_xp"("target_user_id" "uuid", "xp_amount" integer, "xp_reason" "text", "daily_cap" integer) FROM anon, authenticated;

GRANT ALL ON FUNCTION "public"."award_capped_xp"("target_user_id" "uuid", "xp_amount" integer, "xp_reason" "text", "daily_cap" integer) TO "service_role";

REVOKE ALL ON FUNCTION "public"."award_xp_for_new_plant"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."award_xp_for_new_plant"() FROM anon, authenticated;

GRANT ALL ON FUNCTION "public"."award_xp_for_new_plant"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."draw_promo_winner"("p_campaign_id" "uuid", "p_winning_number" integer, "p_notify_others" boolean) FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."draw_promo_winner"("p_campaign_id" "uuid", "p_winning_number" integer, "p_notify_others" boolean) FROM anon, authenticated;

GRANT ALL ON FUNCTION "public"."draw_promo_winner"("p_campaign_id" "uuid", "p_winning_number" integer, "p_notify_others" boolean) TO "service_role";

REVOKE ALL ON FUNCTION "public"."generate_promo_codes"("p_campaign_id" "uuid", "p_count" integer, "p_prefix" "text") FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."generate_promo_codes"("p_campaign_id" "uuid", "p_count" integer, "p_prefix" "text") FROM anon, authenticated;

GRANT ALL ON FUNCTION "public"."generate_promo_codes"("p_campaign_id" "uuid", "p_count" integer, "p_prefix" "text") TO "service_role";

REVOKE ALL ON FUNCTION "public"."get_credit_balance"("target_user_id" "uuid") FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."get_credit_balance"("target_user_id" "uuid") FROM anon, authenticated;

GRANT ALL ON FUNCTION "public"."get_credit_balance"("target_user_id" "uuid") TO "service_role";

REVOKE ALL ON FUNCTION "public"."get_my_lucky_numbers"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."get_my_lucky_numbers"() FROM anon;

GRANT ALL ON FUNCTION "public"."get_my_lucky_numbers"() TO "authenticated";

GRANT ALL ON FUNCTION "public"."get_my_lucky_numbers"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."get_plan_credit_balance"("target_user_id" "uuid") FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."get_plan_credit_balance"("target_user_id" "uuid") FROM anon, authenticated;

GRANT ALL ON FUNCTION "public"."get_plan_credit_balance"("target_user_id" "uuid") TO "service_role";

REVOKE ALL ON FUNCTION "public"."get_xp_balance"("target_user_id" "uuid") FROM PUBLIC;

GRANT ALL ON FUNCTION "public"."get_xp_balance"("target_user_id" "uuid") TO "anon";

GRANT ALL ON FUNCTION "public"."get_xp_balance"("target_user_id" "uuid") TO "authenticated";

GRANT ALL ON FUNCTION "public"."get_xp_balance"("target_user_id" "uuid") TO "service_role";

REVOKE ALL ON FUNCTION "public"."grant_badge_on_proposal_accepted"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."grant_badge_on_proposal_accepted"() FROM anon, authenticated;

GRANT ALL ON FUNCTION "public"."grant_badge_on_proposal_accepted"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."grant_credits"("target_user_id" "uuid", "credit_amount" integer, "grant_reason" "text") FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."grant_credits"("target_user_id" "uuid", "credit_amount" integer, "grant_reason" "text") FROM anon, authenticated;

GRANT ALL ON FUNCTION "public"."grant_credits"("target_user_id" "uuid", "credit_amount" integer, "grant_reason" "text") TO "service_role";

REVOKE ALL ON FUNCTION "public"."mark_badges_celebrated"("p_badge_ids" "text"[]) FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."mark_badges_celebrated"("p_badge_ids" "text"[]) FROM anon;

GRANT ALL ON FUNCTION "public"."mark_badges_celebrated"("p_badge_ids" "text"[]) TO "authenticated";

GRANT ALL ON FUNCTION "public"."mark_badges_celebrated"("p_badge_ids" "text"[]) TO "service_role";

REVOKE ALL ON FUNCTION "public"."redeem_promo_code"("p_code" "text") FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."redeem_promo_code"("p_code" "text") FROM anon;

GRANT ALL ON FUNCTION "public"."redeem_promo_code"("p_code" "text") TO "authenticated";

GRANT ALL ON FUNCTION "public"."redeem_promo_code"("p_code" "text") TO "service_role";

REVOKE ALL ON FUNCTION "public"."reset_credits_to_plan"("target_user_id" "uuid", "target_balance" integer, "grant_reason" "text") FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."reset_credits_to_plan"("target_user_id" "uuid", "target_balance" integer, "grant_reason" "text") FROM anon, authenticated;

GRANT ALL ON FUNCTION "public"."reset_credits_to_plan"("target_user_id" "uuid", "target_balance" integer, "grant_reason" "text") TO "service_role";

REVOKE ALL ON TABLE "public"."articles" FROM anon, authenticated;

GRANT ALL ON TABLE "public"."articles" TO "service_role";

GRANT SELECT ON TABLE "public"."articles" TO "anon";

GRANT SELECT ON TABLE "public"."articles" TO "authenticated";

REVOKE ALL ON TABLE "public"."content_reports" FROM anon, authenticated;

GRANT ALL ON TABLE "public"."content_reports" TO "service_role";

GRANT INSERT ON TABLE "public"."content_reports" TO "authenticated";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_created_subscription AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

INSERT INTO storage.buckets (id, name, public) VALUES
  ('articles', 'articles', true),
  ('avatars', 'avatars', true),
  ('chat-photos', 'chat-photos', true),
  ('plant-photos', 'plant-photos', true),
  ('posts', 'posts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatars images are publicly accessible." ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'avatars'::text));

CREATE POLICY "Chat photos are publicly accessible." ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'chat-photos'::text));

CREATE POLICY "Plant photos are publicly readable" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'plant-photos'::text));

CREATE POLICY "Post images are publicly accessible." ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'posts'::text));

CREATE POLICY "Users can delete their own avatar." ON storage.objects AS PERMISSIVE FOR DELETE TO public USING (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users can delete their own chat photos." ON storage.objects AS PERMISSIVE FOR DELETE TO public USING (((bucket_id = 'chat-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users can delete their own plant photos" ON storage.objects AS PERMISSIVE FOR DELETE TO public USING (((bucket_id = 'plant-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users can delete their own post images." ON storage.objects AS PERMISSIVE FOR DELETE TO public USING (((bucket_id = 'posts'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users can update their own avatar." ON storage.objects AS PERMISSIVE FOR UPDATE TO public USING (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users can update their own plant photos" ON storage.objects AS PERMISSIVE FOR UPDATE TO public USING (((bucket_id = 'plant-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users can upload their own avatar." ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users can upload their own chat photos." ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK (((bucket_id = 'chat-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users can upload their own plant photos" ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK (((bucket_id = 'plant-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users can upload their own post images." ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK (((bucket_id = 'posts'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

SELECT cron.schedule('care_setup_reminders_job', '0 15 * * *', 'select public.send_care_setup_reminders();');

SELECT cron.schedule('weekly_credit_renewal_job', '0 3 * * *', 'select public.renew_all_subscriptions();');

SELECT cron.schedule(
  'send-care-reminders',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://qjooaimeitfrlficipgp.supabase.co/functions/v1/send-care-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'care_reminders_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'check-push-receipts',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://qjooaimeitfrlficipgp.supabase.co/functions/v1/check-push-receipts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'push_receipts_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

SET session_replication_role = replica;

SET check_function_bodies = false;

INSERT INTO "public"."articles" ("id", "slug", "locale", "category", "title", "dek", "cover_url", "reading_minutes", "body", "is_featured", "published_at", "created_at") VALUES
	('d9b2cb02-1801-44c1-9bb2-4bb222153556', 'what-plants-do-unseen', 'en', 'Trivia', 'What plants do when no one is looking', 'They turn toward the light, sleep at night and trade nutrients underground.', 'https://qjooaimeitfrlficipgp.supabase.co/storage/v1/object/public/articles/what-plants-do-unseen/cover.jpg', 2, '[{"text": "Plants seem to just sit in their pots, but they are always reacting to their surroundings. Some of these reactions are so slow you only notice them if you look closely.", "type": "paragraph"}, {"text": "They breathe almost the opposite of us", "type": "heading"}, {"text": "During the day, through photosynthesis, plants absorb carbon dioxide and release oxygen. It''s the reverse of how we breathe.", "type": "paragraph"}, {"text": "They turn toward the light", "type": "heading"}, {"text": "Stems and leaves grow in the direction the light comes from. This is called phototropism, and it''s why rotating the pot now and then helps the plant grow evenly.", "type": "paragraph"}, {"url": "https://qjooaimeitfrlficipgp.supabase.co/storage/v1/object/public/articles/what-plants-do-unseen/window.jpg", "type": "image", "caption": "Near a window, stems and leaves grow toward the light."}, {"text": "Some of them sleep", "type": "heading"}, {"text": "Certain species, like the prayer plant, raise and fold their leaves at night and open them again in the morning, as if they were sleeping.", "type": "paragraph"}, {"url": "https://qjooaimeitfrlficipgp.supabase.co/storage/v1/object/public/articles/what-plants-do-unseen/calathea.jpg", "type": "image", "caption": "Calatheas, relatives of the prayer plant, also fold their leaves at night."}, {"text": "They trade nutrients underground", "type": "heading"}, {"text": "The roots of different plants can connect through fungal networks and exchange nutrients through them. It''s a kind of underground link between plants growing in the same place.", "type": "paragraph"}, {"url": "https://qjooaimeitfrlficipgp.supabase.co/storage/v1/object/public/articles/what-plants-do-unseen/roots.jpg", "type": "image", "caption": "Underground, roots connect through fungal networks."}]', false, '2026-09-28 01:32:53.627523+00', '2026-09-28 01:34:53.627523+00'),
	('e975cb8b-0919-4a9e-b6a9-acec4bb9d5bd', 'what-every-plant-needs', 'pt', 'Primeiros passos', 'O que toda planta precisa pra ficar bem', 'Luz, água na medida certa, um vaso que drena e um pouco de paciência. O resto é detalhe.', 'https://qjooaimeitfrlficipgp.supabase.co/storage/v1/object/public/articles/what-every-plant-needs/cover.jpg', 3, '[{"text": "A maioria das plantas de casa não morre por falta de cuidado, e sim por cuidado demais ou no lugar errado. Antes de pensar em adubo, borrifador ou vaso bonito, vale acertar o básico.", "type": "paragraph"}, {"text": "Luz indireta forte", "type": "heading"}, {"text": "Perto de uma janela clara, mas sem o sol batendo direto nas folhas o dia todo. Se o caule estica em direção ao vidro ou as folhas novas saem pequenas e pálidas, a planta está pedindo mais luz.", "type": "paragraph"}, {"url": "https://qjooaimeitfrlficipgp.supabase.co/storage/v1/object/public/articles/what-every-plant-needs/light.jpg", "type": "image", "caption": "Perto da janela, mas sem sol batendo direto nas folhas o dia todo."}, {"text": "Água quando a terra secar", "type": "heading"}, {"text": "Enfie o dedo uns dois centímetros na terra. Se estiver seca, regue até a água sair pelo fundo do vaso. Se ainda estiver úmida, espere. Essa regra simples funciona melhor do que qualquer calendário fixo.", "type": "paragraph"}, {"url": "https://qjooaimeitfrlficipgp.supabase.co/storage/v1/object/public/articles/what-every-plant-needs/watering.jpg", "type": "image", "caption": "Regue até a água escorrer pelo fundo e descarte o que sobrar no pratinho."}, {"text": "O vaso precisa de furo de drenagem. Sem ele, a água se acumula no fundo e apodrece a raiz, mesmo que você regue pouco.", "type": "tip"}, {"url": "https://qjooaimeitfrlficipgp.supabase.co/storage/v1/object/public/articles/what-every-plant-needs/pot.jpg", "type": "image", "caption": "Na hora de plantar, escolha um vaso com furo no fundo."}, {"text": "Tempo pra se adaptar", "type": "heading"}, {"text": "Planta nova costuma perder uma ou duas folhas nas primeiras semanas. É a adaptação à luz e à umidade da sua casa. Evite trocar de lugar toda hora e não adube nesse período.", "type": "paragraph"}, {"text": "No broto, os lembretes de rega e a análise de crescimento ajudam a acompanhar esse começo sem precisar decorar nada.", "type": "paragraph"}]', true, '2026-09-28 01:34:53.627523+00', '2026-09-28 01:34:53.627523+00'),
	('f3ea6113-55a3-4bf9-8e8b-2c8588687843', 'what-every-plant-needs', 'en', 'Getting started', 'What every plant needs to thrive', 'Light, the right amount of water, a pot that drains and a little patience. Everything else is detail.', 'https://qjooaimeitfrlficipgp.supabase.co/storage/v1/object/public/articles/what-every-plant-needs/cover.jpg', 3, '[{"text": "Most houseplants don''t die from neglect. They die from too much care, or care in the wrong place. Before thinking about fertilizer, misters or a pretty pot, get the basics right.", "type": "paragraph"}, {"text": "Strong indirect light", "type": "heading"}, {"text": "Near a bright window, but without the sun hitting the leaves directly all day. If the stem stretches toward the glass or new leaves come out small and pale, the plant is asking for more light.", "type": "paragraph"}, {"url": "https://qjooaimeitfrlficipgp.supabase.co/storage/v1/object/public/articles/what-every-plant-needs/light.jpg", "type": "image", "caption": "Near the window, but without direct sun on the leaves all day."}, {"text": "Water when the soil dries out", "type": "heading"}, {"text": "Push a finger about two centimeters into the soil. If it''s dry, water until it drains from the bottom of the pot. If it''s still damp, wait. This simple rule works better than any fixed schedule.", "type": "paragraph"}, {"url": "https://qjooaimeitfrlficipgp.supabase.co/storage/v1/object/public/articles/what-every-plant-needs/watering.jpg", "type": "image", "caption": "Water until it drains from the bottom, then empty the saucer."}, {"text": "The pot needs a drainage hole. Without one, water pools at the bottom and rots the roots, even if you water sparingly.", "type": "tip"}, {"url": "https://qjooaimeitfrlficipgp.supabase.co/storage/v1/object/public/articles/what-every-plant-needs/pot.jpg", "type": "image", "caption": "When potting, choose a pot with a drainage hole."}, {"text": "Time to adapt", "type": "heading"}, {"text": "A new plant often drops a leaf or two in the first weeks. It''s adjusting to the light and humidity in your home. Avoid moving it around and don''t fertilize during this period.", "type": "paragraph"}, {"text": "In broto, watering reminders and growth check-ins help you follow this early stage without memorizing anything.", "type": "paragraph"}]', true, '2026-09-28 01:34:53.627523+00', '2026-09-28 01:34:53.627523+00'),
	('c6807b38-9d53-461b-b460-c0ce917b04e7', 'common-beginner-mistakes', 'pt', 'Primeiros passos', 'Três erros comuns de quem está começando', 'Regar demais, demorar pra agir contra pragas e adubar a planta errada. Veja como evitar cada um.', 'https://qjooaimeitfrlficipgp.supabase.co/storage/v1/object/public/articles/common-beginner-mistakes/cover.jpg', 3, '[{"text": "Quase todo mundo que começa a cuidar de plantas passa por esses três tropeços. A boa notícia é que todos têm solução simples.", "type": "paragraph"}, {"text": "Regar todo dia só pra garantir", "type": "heading"}, {"text": "Raiz também precisa de ar. Terra encharcada o tempo todo sufoca a raiz, que começa a apodrecer. Os sinais aparecem nas folhas: amarelas, moles e caindo, mesmo com a terra molhada.", "type": "paragraph"}, {"url": "https://qjooaimeitfrlficipgp.supabase.co/storage/v1/object/public/articles/common-beginner-mistakes/yellow-leaf.jpg", "type": "image", "caption": "Folhas amarelas e moles com a terra molhada costumam indicar excesso de água."}, {"text": "Na dúvida, espere mais um dia. É muito mais fácil salvar uma planta com sede do que uma planta afogada.", "type": "tip"}, {"text": "Ignorar os primeiros sinais de praga", "type": "heading"}, {"text": "Pontinhos brancos, teias finas ou folhas grudentas costumam ser o começo de uma infestação. Quanto antes você perceber, mais fácil resolver. Separe a planta das outras e limpe as folhas.", "type": "paragraph"}, {"url": "https://qjooaimeitfrlficipgp.supabase.co/storage/v1/object/public/articles/common-beginner-mistakes/mealybug.jpg", "type": "image", "caption": "Cochonilha: parece um algodãozinho branco grudado nas folhas e no caule."}, {"text": "Se ficar em dúvida sobre o que está vendo, o diagnóstico por foto ajuda a identificar o problema.", "type": "paragraph"}, {"text": "Adubar uma planta doente", "type": "heading"}, {"text": "Adubo não é remédio. Numa planta fraca ou com a raiz danificada, ele pode queimar a raiz e piorar a situação. Primeiro descubra a causa, deixe a planta se recuperar e só depois volte a adubar.", "type": "paragraph"}, {"url": "https://qjooaimeitfrlficipgp.supabase.co/storage/v1/object/public/articles/common-beginner-mistakes/roots.jpg", "type": "image", "caption": "Antes de adubar, olhe a raiz: saudável é firme e clara, podre fica escura e mole."}]', false, '2026-09-28 01:33:53.627523+00', '2026-09-28 01:34:53.627523+00'),
	('240f9483-d5b7-45ab-bd0b-9929b08c928a', 'common-beginner-mistakes', 'en', 'Getting started', 'Three common beginner mistakes', 'Overwatering, waiting too long on pests and fertilizing the wrong plant. Here is how to avoid each one.', 'https://qjooaimeitfrlficipgp.supabase.co/storage/v1/object/public/articles/common-beginner-mistakes/cover.jpg', 3, '[{"text": "Almost everyone who starts caring for plants trips over these three. The good news is that each one has a simple fix.", "type": "paragraph"}, {"text": "Watering every day just to be safe", "type": "heading"}, {"text": "Roots need air too. Soil that stays soaked suffocates the roots, and they start to rot. The signs show up on the leaves: yellow, limp and dropping, even with wet soil.", "type": "paragraph"}, {"url": "https://qjooaimeitfrlficipgp.supabase.co/storage/v1/object/public/articles/common-beginner-mistakes/yellow-leaf.jpg", "type": "image", "caption": "Yellow, limp leaves on wet soil usually point to overwatering."}, {"text": "When in doubt, wait one more day. A thirsty plant is much easier to save than a drowned one.", "type": "tip"}, {"text": "Ignoring the first signs of pests", "type": "heading"}, {"text": "Tiny white dots, fine webbing or sticky leaves are often the start of an infestation. The sooner you notice, the easier it is to fix. Keep the plant away from the others and wipe the leaves.", "type": "paragraph"}, {"url": "https://qjooaimeitfrlficipgp.supabase.co/storage/v1/object/public/articles/common-beginner-mistakes/mealybug.jpg", "type": "image", "caption": "Mealybugs look like tiny bits of white cotton stuck to leaves and stems."}, {"text": "If you''re not sure what you''re looking at, photo diagnosis can help identify the problem.", "type": "paragraph"}, {"text": "Fertilizing a sick plant", "type": "heading"}, {"text": "Fertilizer isn''t medicine. On a weak plant or one with damaged roots, it can burn the roots and make things worse. Find the cause first, let the plant recover, and only then start fertilizing again.", "type": "paragraph"}, {"url": "https://qjooaimeitfrlficipgp.supabase.co/storage/v1/object/public/articles/common-beginner-mistakes/roots.jpg", "type": "image", "caption": "Before fertilizing, check the roots: healthy ones are firm and light, rotten ones turn dark and mushy."}]', false, '2026-09-28 01:33:53.627523+00', '2026-09-28 01:34:53.627523+00'),
	('e75d4c62-855a-4200-9673-5c5ef4de4cc9', 'what-plants-do-unseen', 'pt', 'Curiosidades', 'O que as plantas fazem quando ninguém está olhando', 'Elas se viram pra luz, dormem à noite e trocam nutrientes por baixo da terra.', 'https://qjooaimeitfrlficipgp.supabase.co/storage/v1/object/public/articles/what-plants-do-unseen/cover.jpg', 2, '[{"text": "Parece que as plantas só ficam paradas no vaso, mas elas estão sempre reagindo ao ambiente. Algumas dessas reações são tão lentas que a gente só percebe olhando com atenção.", "type": "paragraph"}, {"text": "Respiram meio ao contrário da gente", "type": "heading"}, {"text": "Durante o dia, com a fotossíntese, as plantas absorvem gás carbônico e liberam oxigênio. É o caminho inverso da nossa respiração.", "type": "paragraph"}, {"text": "Se viram em direção à luz", "type": "heading"}, {"text": "O caule e as folhas crescem na direção de onde vem a luz. Esse fenômeno se chama fototropismo, e é por isso que vale girar o vaso de vez em quando pra planta crescer por igual.", "type": "paragraph"}, {"url": "https://qjooaimeitfrlficipgp.supabase.co/storage/v1/object/public/articles/what-plants-do-unseen/window.jpg", "type": "image", "caption": "Perto da janela, caules e folhas crescem na direção da luz."}, {"text": "Algumas dormem", "type": "heading"}, {"text": "Certas espécies, como a maranta, levantam e fecham as folhas à noite e abrem de novo pela manhã, como se estivessem dormindo.", "type": "paragraph"}, {"url": "https://qjooaimeitfrlficipgp.supabase.co/storage/v1/object/public/articles/what-plants-do-unseen/calathea.jpg", "type": "image", "caption": "As calateias, parentes da maranta, também fecham as folhas quando anoitece."}, {"text": "Trocam nutrientes por baixo da terra", "type": "heading"}, {"text": "Raízes de plantas diferentes podem se ligar por redes de fungos e trocar nutrientes através delas. É uma espécie de conexão subterrânea entre as plantas de um mesmo lugar.", "type": "paragraph"}, {"url": "https://qjooaimeitfrlficipgp.supabase.co/storage/v1/object/public/articles/what-plants-do-unseen/roots.jpg", "type": "image", "caption": "Debaixo da terra, as raízes se conectam por redes de fungos."}]', false, '2026-09-28 01:32:53.627523+00', '2026-09-28 01:34:53.627523+00'),
	('8959b5e9-8920-4e9a-a1d9-9345ce6f1542', 'why-have-plants-at-home', 'pt', 'Bem-estar', 'Por que vale a pena ter plantas em casa', 'Menos pressa, uma rotina gostosa e a satisfação de ver algo crescer por causa de você.', 'https://qjooaimeitfrlficipgp.supabase.co/storage/v1/object/public/articles/why-have-plants-at-home/cover.jpg', 2, '[{"text": "Ter plantas em casa vai além da decoração. Cuidar delas muda um pouco o ritmo do dia.", "type": "paragraph"}, {"text": "Menos estresse", "type": "heading"}, {"text": "Regar, limpar uma folha, reparar se saiu broto novo. São tarefas pequenas que pedem atenção ao presente e ajudam a desacelerar.", "type": "paragraph"}, {"url": "https://qjooaimeitfrlficipgp.supabase.co/storage/v1/object/public/articles/why-have-plants-at-home/watering.jpg", "type": "image", "caption": "Regar e reparar nas folhas é uma pausa pequena no meio do dia."}, {"text": "Uma rotina que faz bem", "type": "heading"}, {"text": "Plantas pedem constância, não perfeição. O hábito de dar uma olhada nelas algumas vezes por semana traz uma rotina leve e previsível.", "type": "paragraph"}, {"text": "Um ambiente mais agradável", "type": "heading"}, {"text": "As plantas liberam umidade pelas folhas e deixam o ambiente mais bonito e acolhedor. Não substituem a janela aberta, mas somam.", "type": "paragraph"}, {"text": "Ver o resultado do seu cuidado", "type": "heading"}, {"text": "Cada folha nova é a planta respondendo ao que você fez por ela. Acompanhar esse crescimento com fotos ao longo do tempo é uma das partes mais gostosas de cuidar de plantas.", "type": "paragraph"}, {"url": "https://qjooaimeitfrlficipgp.supabase.co/storage/v1/object/public/articles/why-have-plants-at-home/new-leaf.jpg", "type": "image", "caption": "Uma folha nova se abrindo é a planta respondendo ao seu cuidado."}]', false, '2026-09-28 01:31:53.627523+00', '2026-09-28 01:34:53.627523+00'),
	('8305d658-72b3-4a1e-bfcd-97834a8d15b9', 'why-have-plants-at-home', 'en', 'Wellbeing', 'Why plants are worth having at home', 'Less rush, a pleasant routine and the satisfaction of watching something grow because of you.', 'https://qjooaimeitfrlficipgp.supabase.co/storage/v1/object/public/articles/why-have-plants-at-home/cover.jpg', 2, '[{"text": "Having plants at home goes beyond decoration. Caring for them changes the pace of your day a little.", "type": "paragraph"}, {"text": "Less stress", "type": "heading"}, {"text": "Watering, wiping a leaf, noticing a new shoot. These small tasks ask for attention to the present and help you slow down.", "type": "paragraph"}, {"url": "https://qjooaimeitfrlficipgp.supabase.co/storage/v1/object/public/articles/why-have-plants-at-home/watering.jpg", "type": "image", "caption": "Watering and checking the leaves is a small pause in the middle of the day."}, {"text": "A routine that feels good", "type": "heading"}, {"text": "Plants ask for consistency, not perfection. Checking on them a few times a week builds a light, predictable routine.", "type": "paragraph"}, {"text": "A nicer space", "type": "heading"}, {"text": "Plants release moisture through their leaves and make a room feel more welcoming. They don''t replace an open window, but they add to it.", "type": "paragraph"}, {"text": "Seeing the result of your care", "type": "heading"}, {"text": "Every new leaf is the plant responding to what you did for it. Following that growth with photos over time is one of the best parts of caring for plants.", "type": "paragraph"}, {"url": "https://qjooaimeitfrlficipgp.supabase.co/storage/v1/object/public/articles/why-have-plants-at-home/new-leaf.jpg", "type": "image", "caption": "A new leaf unfurling is the plant responding to your care."}]', false, '2026-09-28 01:31:53.627523+00', '2026-09-28 01:34:53.627523+00');

INSERT INTO "public"."badge_batches" ("id", "name", "description", "sort_order", "is_active") VALUES
	('plantas-populares', 'Plantas Populares', 'Emblemas das plantas mais comuns em jardins e casas do Brasil.', 0, true),
	('conquistas', 'Conquistas', 'Emblemas por marcos de engajamento no broto.', 1, true);

INSERT INTO "public"."badges" ("id", "batch_id", "name", "description", "pixel_art", "sort_order", "is_active", "scientific_name") VALUES
	('primeira-doacao', 'conquistas', 'Primeira doação', 'Você participou da sua primeira doação de planta.', '{"size": 32, "pixels": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 1, 4, 2, 2, 2, 3, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 3, 5, 4, 1, 2, 3, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 3, 5, 5, 1, 4, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 4, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 4, 6, 6, 6, 6, 6, 6, 6, 6, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 7, 6, 6, 6, 6, 6, 6, 6, 6, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 8, 8, 8, 8, 8, 8, 8, 8, 8, 7, 7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 9, 9, 9, 9, 9, 9, 9, 7, 7, 9, 9, 9, 9, 9, 8, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 9, 9, 9, 9, 9, 9, 9, 7, 7, 9, 9, 9, 9, 9, 8, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 9, 9, 9, 9, 9, 9, 9, 7, 7, 9, 9, 9, 9, 9, 8, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 9, 9, 9, 9, 9, 9, 9, 7, 7, 9, 9, 9, 9, 9, 8, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 9, 9, 9, 9, 9, 9, 9, 7, 7, 9, 9, 9, 9, 9, 8, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 9, 9, 9, 9, 9, 9, 9, 7, 7, 9, 9, 9, 9, 9, 8, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 9, 9, 9, 9, 9, 9, 9, 7, 7, 9, 9, 9, 9, 9, 8, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 9, 9, 9, 9, 9, 9, 9, 7, 7, 9, 9, 9, 9, 9, 8, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 9, 9, 9, 9, 9, 9, 9, 7, 7, 9, 9, 9, 9, 9, 8, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 9, 9, 9, 9, 9, 9, 9, 7, 7, 9, 9, 9, 9, 9, 8, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 9, 9, 9, 9, 9, 9, 9, 7, 7, 9, 9, 9, 9, 9, 8, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 9, 9, 9, 9, 9, 9, 9, 7, 7, 9, 9, 9, 9, 9, 8, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "palette": [null, "#26301F", "#7CC47E", "#4E9A5F", "#3D6B2F", "#2F6B3F", "#E04A52", "#D4AF37", "#8E1F28", "#C8323A"]}', 3, true, NULL),
	('primeira-venda', 'conquistas', 'Primeiro negócio', 'Você fechou sua primeira compra ou venda de planta.', '{"size": 32, "pixels": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 2, 3, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 3, 3, 3, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 3, 4, 3, 3, 3, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 4, 4, 4, 4, 3, 3, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 3, 4, 3, 4, 3, 3, 3, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 3, 3, 3, 4, 4, 3, 3, 4, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 5, 5, 5, 3, 3, 3, 4, 4, 4, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 6, 6, 6, 1, 7, 5, 5, 5, 6, 6, 4, 4, 4, 4, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 6, 6, 6, 6, 8, 7, 1, 5, 6, 6, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 6, 6, 8, 8, 1, 7, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 7, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 7, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 7, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 7, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 7, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 7, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 10, 10, 9, 10, 10, 9, 7, 10, 9, 10, 10, 9, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 12, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 12, 12, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 12, 12, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 13, 11, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 12, 12, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 13, 11, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 12, 12, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 13, 11, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 12, 12, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 13, 11, 13, 13, 13, 13, 13, 13, 13, 13, 12, 12, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 13, 11, 13, 13, 13, 13, 13, 13, 13, 13, 12, 12, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 13, 11, 13, 13, 13, 13, 13, 13, 13, 13, 12, 12, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 13, 11, 13, 13, 13, 13, 13, 13, 12, 12, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "palette": [null, "#26301F", "#F6D77A", "#E3B341", "#B8892B", "#7CC47E", "#4E9A5F", "#3D6B2F", "#2F6B3F", "#35241A", "#4A3222", "#DE8B65", "#A4553A", "#C8704C"]}', 4, true, NULL),
	('monstera-deliciosa', 'plantas-populares', 'Costela-de-adao', 'Você cadastrou uma Costela-de-adão no seu jardim e suas folhas recortadas entraram pra coleção.', '{"size": 32, "pixels": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 2, 3, 3, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 4, 3, 3, 3, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 4, 3, 1, 3, 3, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 2, 2, 1, 3, 3, 4, 3, 3, 3, 3, 4, 2, 2, 3, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 4, 2, 3, 3, 3, 3, 4, 3, 3, 3, 4, 4, 2, 4, 3, 3, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 3, 4, 3, 1, 3, 3, 3, 4, 3, 4, 1, 4, 4, 3, 4, 3, 1, 3, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 3, 3, 4, 3, 3, 3, 1, 3, 4, 4, 4, 4, 1, 3, 3, 4, 3, 3, 3, 4, 1, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 3, 3, 3, 4, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 3, 3, 4, 3, 3, 4, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 1, 3, 3, 3, 3, 4, 3, 4, 1, 3, 4, 4, 4, 4, 3, 3, 3, 3, 4, 3, 4, 1, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 3, 1, 3, 4, 4, 4, 4, 4, 1, 5, 1, 1, 3, 3, 1, 3, 4, 4, 4, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 3, 3, 4, 4, 4, 4, 1, 1, 5, 1, 0, 1, 3, 3, 3, 4, 4, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 4, 4, 4, 5, 1, 0, 1, 5, 1, 0, 1, 5, 1, 4, 4, 4, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 5, 1, 0, 1, 5, 1, 1, 5, 1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 1, 1, 5, 1, 1, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 5, 1, 5, 1, 1, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 1, 5, 1, 5, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 1, 5, 1, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 5, 5, 5, 1, 5, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 6, 7, 7, 6, 7, 5, 5, 7, 5, 6, 7, 7, 6, 7, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "palette": [null, "#26301F", "#7CC47E", "#4E9A5F", "#2F6B3F", "#3D6B2F", "#35241A", "#4A3222", "#DE8B65", "#A4553A", "#C8704C"]}', 0, true, 'Monstera deliciosa'),
	('dracaena-trifasciata', 'plantas-populares', 'Espada-de-sao-jorge', 'Você cadastrou uma Espada-de-são-jorge no seu jardim, a protetora clássica de todo lar.', '{"size": 32, "pixels": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 2, 1, 0, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 1, 2, 3, 1, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 1, 2, 1, 0, 0, 1, 3, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 1, 2, 1, 0, 0, 1, 2, 1, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 1, 1, 2, 3, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 4, 1, 1, 2, 1, 0, 1, 2, 3, 1, 1, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 4, 1, 1, 2, 1, 0, 1, 2, 4, 1, 1, 3, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 1, 1, 2, 3, 1, 1, 2, 4, 1, 1, 2, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 4, 1, 1, 2, 4, 4, 1, 2, 3, 1, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 4, 1, 1, 2, 4, 4, 1, 2, 4, 4, 1, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 1, 2, 4, 3, 4, 1, 2, 4, 4, 2, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 4, 4, 2, 4, 4, 4, 2, 2, 3, 4, 2, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 4, 4, 2, 4, 4, 4, 2, 4, 4, 4, 2, 3, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 2, 4, 3, 4, 2, 4, 4, 4, 2, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 4, 4, 2, 4, 4, 4, 2, 4, 3, 2, 2, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 4, 4, 2, 4, 4, 4, 2, 4, 4, 2, 4, 3, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 4, 2, 4, 4, 4, 2, 4, 4, 2, 4, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 6, 6, 5, 6, 6, 5, 6, 6, 5, 6, 6, 5, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 8, 8, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 7, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 7, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 7, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 7, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 7, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 7, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 7, 9, 9, 9, 9, 9, 9, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "palette": [null, "#26301F", "#D8C24A", "#1F4A2E", "#2F6B3F", "#35241A", "#4A3222", "#555555", "#262626", "#3A3A3A"]}', 2, true, 'Dracaena trifasciata'),
	('epipremnum-aureum', 'plantas-populares', 'Jiboia', 'Você cadastrou uma Jiboia no seu jardim, a queridinha que cresce em qualquer cantinho.', '{"size": 32, "pixels": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 4, 3, 3, 5, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 3, 3, 5, 5, 2, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 3, 5, 5, 2, 3, 3, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 3, 3, 3, 2, 4, 3, 3, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 4, 3, 3, 5, 3, 3, 3, 5, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 3, 3, 3, 5, 5, 6, 3, 5, 5, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 3, 3, 5, 5, 2, 3, 1, 6, 1, 2, 2, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 3, 3, 3, 6, 2, 3, 3, 3, 1, 2, 2, 3, 3, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 4, 3, 3, 5, 2, 4, 3, 3, 5, 5, 2, 4, 3, 3, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 3, 3, 5, 5, 1, 3, 3, 5, 5, 1, 3, 3, 3, 5, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 5, 5, 1, 1, 6, 5, 5, 6, 1, 1, 3, 5, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 6, 6, 1, 6, 6, 6, 1, 1, 6, 6, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 6, 6, 1, 6, 6, 1, 6, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 6, 6, 6, 6, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 6, 7, 7, 8, 7, 7, 6, 6, 7, 8, 7, 7, 8, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 6, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 6, 10, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 10, 6, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 2, 3, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 3, 5, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 3, 3, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 5, 5, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 3, 5, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 6, 1, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 2, 3, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 3, 3, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 3, 5, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 3, 5, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 5, 5, 1, 1, 11, 9, 11, 11, 11, 11, 11, 11, 10, 10, 1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "palette": [null, "#26301F", "#B9D86A", "#6DB356", "#E6E08A", "#3F7F3A", "#3D6B2F", "#4A3222", "#35241A", "#FAF6EC", "#CFC6B2", "#EDE6D6"]}', 1, true, 'Epipremnum aureum'),
	('syngonium-podophyllum', 'plantas-populares', 'Singonio', 'Você cadastrou um Singônio no seu jardim e suas folhinhas em flecha se juntaram à turma.', '{"size": 32, "pixels": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 3, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 4, 3, 4, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 4, 4, 3, 4, 5, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 1, 4, 4, 4, 3, 5, 5, 5, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 3, 4, 4, 4, 4, 3, 5, 5, 1, 1, 1, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 4, 3, 4, 4, 4, 5, 4, 5, 1, 1, 2, 2, 3, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 4, 4, 3, 4, 5, 5, 1, 6, 2, 1, 2, 2, 4, 3, 4, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 4, 4, 3, 5, 5, 5, 2, 2, 3, 4, 4, 4, 4, 3, 4, 5, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 4, 3, 5, 5, 2, 2, 4, 3, 4, 4, 4, 4, 3, 5, 5, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 4, 5, 1, 2, 4, 4, 3, 4, 5, 5, 4, 3, 5, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 6, 1, 4, 4, 4, 3, 5, 5, 5, 5, 4, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 6, 1, 1, 4, 4, 3, 5, 5, 1, 6, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 6, 1, 1, 5, 4, 5, 1, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 6, 6, 1, 6, 6, 1, 6, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 6, 1, 6, 6, 6, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 6, 6, 1, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 6, 6, 6, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 7, 8, 8, 7, 8, 8, 6, 8, 8, 7, 8, 8, 7, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 10, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 9, 11, 11, 11, 11, 11, 11, 10, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "palette": [null, "#26301F", "#B7E4A8", "#DDF2D2", "#7CC47E", "#4E9A5F", "#3D6B2F", "#35241A", "#4A3222", "#5A8CC0", "#2C5382", "#3E6FA3"]}', 3, true, 'Syngonium podophyllum'),
	('dieffenbachia-seguine', 'plantas-populares', 'Comigo-ninguem-pode', 'Você cadastrou uma Comigo-ninguém-pode no seu jardim, com respeito às suas folhas espertas.', '{"size": 32, "pixels": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 2, 2, 2, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 3, 2, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 4, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 1, 2, 4, 4, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 2, 2, 2, 3, 2, 1, 5, 5, 1, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 3, 2, 2, 4, 1, 5, 5, 1, 2, 3, 2, 2, 2, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 4, 4, 4, 5, 5, 5, 1, 2, 2, 2, 3, 2, 2, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 4, 4, 4, 4, 1, 5, 5, 5, 5, 2, 2, 2, 2, 4, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 5, 5, 5, 1, 2, 4, 4, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 2, 2, 2, 3, 2, 5, 5, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 3, 2, 2, 4, 5, 5, 2, 3, 2, 2, 2, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 4, 4, 4, 5, 5, 2, 2, 2, 3, 2, 2, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 4, 4, 4, 4, 5, 5, 5, 2, 2, 2, 2, 4, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 5, 5, 5, 2, 4, 4, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 5, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 6, 7, 7, 6, 7, 7, 5, 5, 7, 6, 7, 7, 6, 7, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "palette": [null, "#26301F", "#4E9A5F", "#E3EDB7", "#2F6B3F", "#6E8F4A", "#35241A", "#4A3222", "#A5BA98", "#6F8765", "#8BA27E"]}', 4, true, 'Dieffenbachia seguine'),
	('chrysalidocarpus-lutescens', 'plantas-populares', 'Areca-bambu', 'Você cadastrou uma Areca-bambu no seu jardim e deu um ar tropical à coleção.', '{"size": 32, "pixels": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 0, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 0, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 2, 1, 0, 1, 2, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 1, 3, 2, 4, 1, 3, 2, 4, 1, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 1, 3, 2, 4, 1, 3, 2, 4, 1, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 1, 4, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 3, 1, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 3, 2, 4, 1, 3, 2, 4, 1, 3, 2, 4, 1, 3, 2, 4, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 0, 1, 3, 2, 4, 3, 2, 4, 1, 3, 2, 4, 3, 2, 4, 1, 0, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 1, 1, 0, 1, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 1, 0, 1, 1, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 1, 3, 1, 4, 2, 1, 1, 3, 2, 4, 3, 2, 3, 2, 4, 3, 2, 4, 1, 1, 2, 3, 1, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 1, 4, 2, 1, 3, 1, 4, 3, 2, 3, 2, 4, 3, 1, 4, 1, 2, 3, 1, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 3, 4, 4, 2, 3, 2, 4, 2, 1, 2, 3, 2, 4, 2, 3, 3, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 3, 1, 4, 2, 3, 3, 2, 3, 3, 2, 4, 2, 3, 1, 4, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 1, 4, 2, 2, 2, 2, 2, 2, 2, 3, 1, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 3, 1, 4, 2, 2, 2, 3, 1, 4, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 6, 6, 5, 6, 6, 5, 6, 6, 5, 6, 6, 5, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 8, 8, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 7, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 7, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 7, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 7, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 7, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 7, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 7, 9, 9, 9, 9, 9, 9, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "palette": [null, "#26301F", "#8BAF3A", "#4E9A5F", "#9CCB5E", "#35241A", "#4A3222", "#EBA7B4", "#B86C7D", "#D98A9A"]}', 5, true, 'Chrysalidocarpus lutescens'),
	('haworthia-attenuata', 'plantas-populares', 'Haworthia-zebra', 'Você cadastrou uma Haworthia-zebra no seu jardim, listrada e cheia de estilo.', '{"size": 32, "pixels": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 2, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 1, 2, 3, 1, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 1, 1, 2, 1, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 2, 3, 2, 1, 3, 1, 1, 2, 2, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 1, 2, 1, 2, 1, 2, 1, 1, 2, 2, 1, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 1, 3, 2, 3, 2, 3, 2, 3, 1, 2, 2, 1, 1, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 1, 1, 1, 2, 2, 1, 2, 1, 1, 2, 1, 1, 1, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 1, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 3, 2, 3, 2, 2, 2, 3, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 5, 5, 4, 5, 5, 4, 5, 5, 4, 5, 5, 4, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 7, 7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 7, 7, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 8, 6, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 7, 7, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 8, 6, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 7, 7, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 8, 6, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 7, 7, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 8, 6, 8, 8, 8, 8, 8, 8, 8, 8, 7, 7, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 8, 6, 8, 8, 8, 8, 8, 8, 8, 8, 7, 7, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 8, 6, 8, 8, 8, 8, 8, 8, 8, 8, 7, 7, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 8, 6, 8, 8, 8, 8, 8, 8, 7, 7, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "palette": [null, "#26301F", "#1F4A2E", "#E8EEE0", "#35241A", "#4A3222", "#DE8B65", "#A4553A", "#C8704C"]}', 10, true, 'Haworthia attenuata'),
	('chamaedorea-elegans', 'plantas-populares', 'Palmeira-rafia', 'Você cadastrou uma Palmeira-ráfia no seu jardim, elegante como o nome sugere.', '{"size": 32, "pixels": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 2, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 3, 2, 4, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 2, 4, 1, 2, 1, 3, 2, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 3, 2, 4, 3, 2, 4, 3, 2, 4, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 1, 4, 1, 3, 2, 3, 2, 3, 2, 4, 1, 3, 1, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 1, 4, 1, 2, 3, 2, 4, 2, 1, 3, 1, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 2, 4, 3, 2, 4, 2, 3, 2, 4, 3, 2, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 2, 3, 3, 3, 2, 3, 2, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 3, 3, 3, 3, 2, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 2, 2, 2, 3, 2, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 6, 6, 5, 6, 6, 5, 6, 6, 5, 6, 6, 5, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 8, 8, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 7, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 7, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 7, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 7, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 7, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 7, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 7, 9, 9, 9, 9, 9, 9, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "palette": [null, "#26301F", "#3D6B2F", "#4E9A5F", "#2F6B3F", "#35241A", "#4A3222", "#E6C06A", "#B08534", "#D4A646"]}', 6, true, 'Chamaedorea elegans'),
	('rhaphidophora-tetrasperma', 'plantas-populares', 'Costela-de-adao-mini', 'Você cadastrou uma Costela-de-adão mini no seu jardim, a versão compacta que cabe em qualquer canto.', '{"size": 32, "pixels": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 3, 3, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 3, 3, 3, 3, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 3, 1, 3, 3, 3, 4, 4, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 3, 3, 3, 1, 4, 4, 4, 1, 1, 2, 2, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 1, 3, 3, 4, 1, 1, 5, 1, 1, 2, 2, 3, 3, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 3, 1, 4, 4, 6, 6, 5, 1, 1, 3, 3, 3, 1, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 4, 4, 1, 1, 6, 6, 6, 6, 3, 3, 1, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 6, 6, 1, 1, 4, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 5, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 3, 1, 0, 1, 5, 1, 0, 1, 2, 2, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 3, 3, 3, 1, 1, 5, 1, 1, 2, 2, 3, 3, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 1, 3, 3, 4, 1, 1, 5, 1, 1, 3, 3, 3, 1, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 3, 1, 4, 4, 6, 6, 5, 6, 6, 3, 3, 1, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 4, 4, 1, 1, 6, 6, 6, 1, 1, 4, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 5, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 5, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 7, 8, 8, 7, 8, 8, 5, 8, 8, 7, 8, 8, 7, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 10, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 9, 11, 11, 11, 11, 11, 11, 10, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "palette": [null, "#26301F", "#7CC47E", "#4E9A5F", "#2F6B3F", "#6E8F4A", "#3D6B2F", "#35241A", "#4A3222", "#BAB8B0", "#817F78", "#A09E96"]}', 7, true, 'Rhaphidophora tetrasperma'),
	('scindapsus-aureus', 'plantas-populares', 'Jiboia-prateada', 'Você cadastrou uma Jiboia-prateada no seu jardim e seu brilho metálico entrou pra coleção.', '{"size": 32, "pixels": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 2, 3, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 4, 3, 3, 3, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 3, 3, 3, 4, 5, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 3, 3, 3, 5, 5, 2, 3, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 2, 3, 3, 3, 5, 4, 3, 3, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 4, 3, 3, 3, 6, 3, 3, 3, 4, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 3, 3, 4, 5, 6, 3, 3, 3, 5, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 3, 3, 5, 5, 6, 1, 3, 3, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 3, 5, 1, 6, 1, 6, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 6, 6, 6, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 6, 6, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 6, 6, 6, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 7, 8, 8, 7, 8, 8, 6, 8, 8, 7, 8, 8, 7, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 6, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 10, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 10, 6, 3, 1, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 3, 4, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 5, 3, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 6, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 1, 3, 1, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 1, 3, 4, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 1, 5, 3, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 9, 11, 11, 11, 11, 11, 11, 10, 10, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "palette": [null, "#26301F", "#6F9A7E", "#3E6B4E", "#C9D8CF", "#2C4F39", "#3D6B2F", "#35241A", "#4A3222", "#46908B", "#225956", "#2F7470"]}', 8, true, 'Scindapsus aureus'),
	('oxalis-triangularis', 'plantas-populares', 'Trevo-roxo', 'Você cadastrou um Trevo-roxo no seu jardim, com aquelas folhinhas que dançam à noite.', '{"size": 32, "pixels": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 5, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 5, 5, 6, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 5, 5, 7, 6, 5, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 5, 5, 7, 1, 6, 5, 7, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 5, 5, 1, 5, 7, 7, 1, 6, 7, 7, 1, 4, 5, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 5, 5, 7, 1, 1, 1, 1, 8, 6, 1, 1, 1, 5, 5, 7, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 5, 5, 7, 7, 5, 5, 1, 1, 8, 6, 1, 4, 5, 5, 7, 7, 5, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 5, 7, 1, 5, 5, 7, 1, 1, 8, 6, 1, 5, 5, 7, 1, 5, 5, 7, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 7, 7, 1, 5, 4, 5, 5, 1, 8, 6, 1, 4, 5, 5, 1, 5, 7, 7, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 8, 1, 5, 5, 7, 1, 6, 1, 1, 5, 5, 7, 8, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 5, 5, 7, 7, 5, 6, 4, 5, 5, 7, 7, 5, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 5, 7, 1, 5, 5, 6, 5, 5, 7, 8, 5, 5, 7, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 7, 7, 1, 5, 7, 6, 5, 7, 7, 8, 5, 7, 7, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 8, 1, 1, 6, 1, 1, 8, 8, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 8, 1, 6, 1, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 8, 8, 6, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 8, 6, 8, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 10, 10, 9, 10, 10, 6, 10, 10, 9, 10, 10, 9, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 12, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 12, 12, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 12, 12, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 13, 11, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 12, 12, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 13, 11, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 12, 12, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 13, 11, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 12, 12, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 13, 11, 13, 13, 13, 13, 13, 13, 13, 13, 12, 12, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 13, 11, 13, 13, 13, 13, 13, 13, 13, 13, 12, 12, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 13, 11, 13, 13, 13, 13, 13, 13, 13, 13, 12, 12, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 13, 11, 13, 13, 13, 13, 13, 13, 12, 12, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "palette": [null, "#26301F", "#F2B6D6", "#F7E07A", "#8E5AA0", "#6B3A7A", "#9C7AA8", "#4E2A5A", "#7A4E86", "#35241A", "#4A3222", "#A6724F", "#6C442D", "#8A5A3C"]}', 9, true, 'Oxalis triangularis'),
	('beaucarnea-recurvata', 'plantas-populares', 'Pata-de-elefante', 'Você cadastrou uma Pata-de-elefante no seu jardim, com o tronco guardando água pros dias difíceis.', '{"size": 32, "pixels": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 1, 2, 2, 1, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 1, 2, 1, 1, 1, 2, 2, 1, 1, 1, 2, 1, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 1, 0, 1, 0, 0, 1, 3, 3, 1, 0, 0, 1, 0, 1, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 0, 0, 0, 0, 1, 3, 3, 1, 0, 0, 0, 0, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 3, 3, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 3, 3, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 4, 4, 3, 3, 5, 5, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 4, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 5, 5, 5, 5, 5, 3, 3, 3, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 6, 7, 7, 6, 5, 3, 3, 3, 3, 3, 7, 7, 6, 7, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "palette": [null, "#26301F", "#2F6B3F", "#8E6E48", "#D2B48A", "#B89468", "#35241A", "#4A3222", "#FAF6EC", "#CFC6B2", "#EDE6D6"]}', 11, true, 'Beaucarnea recurvata'),
	('agave-americana', 'plantas-populares', 'Agave', 'Você cadastrou uma Agave no seu jardim, resistente e cheia de personalidade.', '{"size": 32, "pixels": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 3, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 1, 3, 1, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 1, 0, 1, 3, 1, 0, 1, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 1, 0, 1, 3, 1, 0, 1, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 3, 1, 1, 3, 1, 0, 1, 3, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 0, 0, 1, 3, 1, 1, 3, 1, 0, 1, 3, 1, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 3, 1, 0, 0, 1, 3, 1, 1, 3, 1, 1, 3, 1, 0, 0, 1, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 1, 0, 0, 1, 3, 1, 4, 3, 4, 1, 3, 1, 0, 1, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 1, 0, 1, 4, 3, 4, 4, 3, 4, 4, 3, 4, 1, 1, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 3, 1, 1, 4, 3, 4, 4, 3, 4, 4, 3, 4, 1, 3, 3, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 1, 4, 3, 4, 1, 1, 4, 3, 4, 3, 4, 4, 3, 4, 4, 3, 4, 1, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 1, 3, 1, 0, 1, 4, 3, 4, 1, 4, 3, 4, 3, 4, 4, 3, 4, 4, 3, 4, 1, 1, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 1, 1, 4, 3, 4, 1, 3, 3, 3, 3, 3, 3, 3, 4, 4, 3, 4, 1, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 3, 4, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 3, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 3, 4, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 3, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 3, 3, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 3, 3, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 6, 6, 5, 6, 6, 5, 6, 6, 5, 6, 6, 5, 6, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 8, 8, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 7, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 7, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 7, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 7, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 7, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 7, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 7, 9, 9, 9, 9, 9, 9, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "palette": [null, "#26301F", "#5B3A2A", "#8DA9A6", "#6B8784", "#35241A", "#4A3222", "#555555", "#262626", "#3A3A3A"]}', 12, true, 'Agave americana'),
	('portulacaria-afra', 'plantas-populares', 'Onze-horas', 'Você cadastrou uma Onze-horas no seu jardim, fácil de cuidar e sempre verdinha.', '{"size": 32, "pixels": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 3, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 3, 4, 4, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 3, 1, 2, 2, 3, 5, 2, 2, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 3, 4, 1, 3, 3, 4, 5, 3, 3, 4, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 4, 4, 1, 3, 4, 4, 5, 3, 4, 4, 1, 2, 2, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 3, 2, 2, 3, 1, 1, 5, 1, 1, 1, 1, 3, 3, 4, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 3, 4, 3, 3, 4, 1, 1, 2, 2, 3, 2, 2, 3, 4, 2, 2, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 4, 4, 3, 4, 4, 1, 1, 3, 3, 4, 3, 3, 4, 1, 3, 3, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 3, 5, 3, 4, 4, 2, 3, 4, 1, 3, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 3, 4, 5, 1, 1, 3, 3, 4, 1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 4, 4, 5, 1, 1, 3, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 5, 1, 1, 5, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 1, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 1, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 5, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 6, 7, 7, 6, 7, 7, 5, 7, 7, 6, 7, 7, 6, 7, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "palette": [null, "#26301F", "#A6D98A", "#6DB356", "#3F7F3A", "#7A4A3A", "#35241A", "#4A3222", "#5A8CC0", "#2C5382", "#3E6FA3"]}', 13, true, 'Portulacaria afra'),
	('adenium-obesum', 'plantas-populares', 'Rosa-do-deserto', 'Você cadastrou uma Rosa-do-deserto no seu jardim, com flores lindas e tronco cheio de charme.', '{"size": 32, "pixels": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 3, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 2, 1, 2, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 2, 1, 1, 4, 4, 4, 4, 1, 1, 2, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 3, 1, 2, 4, 4, 4, 4, 5, 5, 2, 1, 3, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 1, 1, 4, 4, 5, 5, 1, 1, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 4, 4, 1, 0, 1, 1, 6, 1, 0, 1, 4, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 4, 4, 4, 5, 1, 0, 1, 6, 1, 1, 4, 4, 4, 4, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 5, 5, 1, 0, 0, 1, 6, 1, 0, 1, 4, 5, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 6, 1, 1, 1, 6, 1, 1, 6, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 6, 6, 1, 6, 6, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 6, 6, 6, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 7, 7, 6, 6, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 7, 7, 7, 8, 8, 8, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 7, 7, 8, 8, 8, 8, 8, 8, 8, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 8, 8, 8, 8, 8, 8, 8, 9, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 8, 8, 8, 8, 9, 9, 9, 9, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 11, 11, 10, 8, 8, 9, 9, 9, 9, 11, 11, 10, 11, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 13, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 13, 13, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 13, 13, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 14, 12, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 13, 13, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 14, 12, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 13, 13, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 14, 12, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 13, 13, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 14, 12, 14, 14, 14, 14, 14, 14, 14, 14, 13, 13, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 14, 12, 14, 14, 14, 14, 14, 14, 14, 14, 13, 13, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 14, 12, 14, 14, 14, 14, 14, 14, 14, 14, 13, 13, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 14, 12, 14, 14, 14, 14, 14, 14, 13, 13, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "palette": [null, "#26301F", "#E8658F", "#FBE7EE", "#4E9A5F", "#2F6B3F", "#A88A62", "#D2B48A", "#B89468", "#8E6E48", "#35241A", "#4A3222", "#A5BA98", "#6F8765", "#8BA27E"]}', 14, true, 'Adenium obesum'),
	('hibiscus-rosa-sinensis', 'plantas-populares', 'Hibisco', 'Você cadastrou um Hibisco no seu jardim e trouxe flores grandes e coloridas pra coleção.', '{"size": 32, "pixels": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 1, 3, 1, 2, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 4, 4, 4, 4, 2, 5, 5, 5, 5, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 4, 2, 4, 4, 2, 5, 2, 5, 5, 2, 5, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 4, 3, 4, 2, 5, 5, 5, 5, 5, 2, 5, 3, 5, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 4, 2, 4, 5, 5, 5, 5, 5, 5, 5, 5, 2, 5, 6, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 2, 5, 2, 5, 5, 5, 5, 5, 5, 5, 2, 6, 2, 6, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 7, 7, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 7, 7, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 7, 7, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 7, 7, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 7, 7, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 7, 7, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 8, 9, 9, 8, 9, 9, 7, 7, 9, 8, 9, 9, 8, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 11, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 11, 11, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 12, 10, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 11, 11, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 12, 10, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 11, 11, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 12, 10, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 11, 11, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 12, 10, 12, 12, 12, 12, 12, 12, 12, 12, 11, 11, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 12, 10, 12, 12, 12, 12, 12, 12, 12, 12, 11, 11, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 12, 10, 12, 12, 12, 12, 12, 12, 12, 12, 11, 11, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 12, 10, 12, 12, 12, 12, 12, 12, 11, 11, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "palette": [null, "#26301F", "#D93445", "#F7D25A", "#7CC47E", "#4E9A5F", "#2F6B3F", "#6E5A3A", "#35241A", "#4A3222", "#EBA7B4", "#B86C7D", "#D98A9A"]}', 15, true, 'Hibiscus rosa-sinensis'),
	('streak-7-dias', 'conquistas', 'Chama acesa', 'Você cuidou das suas plantas por 7 dias seguidos.', '{"size": 32, "pixels": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 3, 3, 3, 3, 3, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 3, 3, 3, 3, 3, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 3, 3, 3, 3, 3, 3, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 3, 3, 3, 3, 3, 3, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 3, 3, 4, 4, 4, 3, 3, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 3, 3, 4, 4, 4, 3, 3, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 3, 3, 4, 4, 4, 4, 3, 3, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 3, 3, 4, 4, 4, 4, 3, 3, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 3, 3, 4, 4, 4, 4, 3, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 3, 3, 4, 4, 4, 3, 3, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 3, 4, 4, 4, 3, 3, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 3, 3, 4, 4, 3, 3, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 3, 4, 4, 3, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "palette": [null, "#26301F", "#E4572E", "#F08A3E", "#F7D25A"]}', 0, true, NULL),
	('guzmania-lingulata', 'plantas-populares', 'Bromelia', 'Você cadastrou uma Bromélia no seu jardim, com aquele coração colorido no centro.', '{"size": 32, "pixels": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 3, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 1, 0, 0, 0, 1, 5, 1, 3, 1, 0, 0, 0, 0, 1, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 1, 0, 1, 1, 5, 1, 5, 1, 0, 1, 0, 1, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 4, 1, 1, 4, 1, 5, 1, 5, 1, 1, 4, 1, 1, 4, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 1, 0, 0, 1, 4, 1, 4, 1, 5, 1, 5, 1, 1, 4, 1, 4, 1, 0, 0, 1, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 1, 1, 1, 4, 4, 1, 4, 3, 1, 3, 1, 4, 1, 4, 4, 1, 1, 1, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 4, 1, 1, 4, 1, 4, 3, 1, 3, 1, 4, 1, 4, 1, 1, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 4, 1, 4, 4, 4, 3, 1, 3, 1, 4, 4, 4, 1, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 4, 4, 4, 4, 3, 4, 3, 4, 5, 4, 4, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 6, 7, 7, 6, 7, 7, 6, 7, 7, 6, 7, 7, 6, 7, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "palette": [null, "#26301F", "#F7D25A", "#E4572E", "#2F6B3F", "#F08A3E", "#35241A", "#4A3222", "#E6C06A", "#B08534", "#D4A646"]}', 16, true, 'Guzmania lingulata'),
	('gymnocalycium-mihanovichii', 'plantas-populares', 'Cacto-bola', 'Você cadastrou um Cacto-bola no seu jardim, coloridinho e sem espinhos ameaçadores.', '{"size": 32, "pixels": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 2, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 2, 2, 2, 4, 3, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 2, 2, 3, 4, 3, 4, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 4, 3, 3, 3, 4, 3, 4, 3, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 4, 3, 3, 3, 4, 3, 4, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 4, 3, 3, 3, 4, 3, 4, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 3, 3, 3, 4, 4, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 3, 3, 4, 4, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 4, 4, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 5, 5, 5, 5, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 5, 5, 5, 5, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 5, 5, 5, 5, 5, 6, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 5, 5, 5, 6, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 5, 5, 5, 6, 6, 6, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 7, 8, 8, 7, 8, 8, 5, 5, 8, 7, 8, 8, 7, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 10, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 9, 11, 11, 11, 11, 11, 11, 10, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "palette": [null, "#26301F", "#F27A8E", "#E0455E", "#B32E48", "#4E9A5F", "#2F6B3F", "#35241A", "#4A3222", "#BAB8B0", "#817F78", "#A09E96"]}', 17, true, 'Gymnocalycium mihanovichii'),
	('mammillaria-elongata', 'plantas-populares', 'Cacto-coluna', 'Você cadastrou um Cacto-coluna no seu jardim, com os espinhos dourados brilhando.', '{"size": 32, "pixels": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 4, 5, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 6, 5, 1, 2, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 4, 4, 5, 1, 4, 4, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 2, 1, 4, 6, 5, 1, 4, 6, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 4, 5, 1, 4, 4, 5, 1, 4, 4, 5, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 6, 5, 1, 4, 6, 5, 1, 4, 6, 5, 1, 2, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 4, 5, 1, 4, 4, 5, 1, 4, 4, 5, 1, 4, 4, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 6, 5, 1, 4, 6, 5, 1, 4, 6, 5, 1, 4, 6, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 4, 5, 1, 4, 4, 5, 1, 4, 4, 5, 1, 4, 4, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 6, 5, 1, 4, 6, 5, 1, 4, 6, 5, 1, 4, 6, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 4, 5, 1, 4, 4, 5, 1, 4, 4, 5, 1, 4, 4, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 6, 5, 1, 4, 6, 5, 1, 4, 6, 5, 1, 4, 6, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 4, 5, 1, 4, 4, 5, 1, 4, 4, 5, 1, 4, 4, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 6, 5, 1, 4, 6, 5, 1, 4, 6, 5, 1, 4, 6, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 4, 5, 1, 4, 4, 5, 1, 4, 4, 5, 1, 4, 4, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 6, 5, 1, 4, 6, 5, 1, 4, 6, 5, 1, 4, 6, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 7, 8, 8, 7, 8, 8, 7, 8, 8, 7, 8, 8, 7, 8, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 10, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 9, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 9, 11, 11, 11, 11, 11, 11, 10, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "palette": [null, "#26301F", "#E8658F", "#F29BB2", "#4E9A5F", "#2F6B3F", "#F2E3A0", "#35241A", "#4A3222", "#46908B", "#225956", "#2F7470"]}', 18, true, 'Mammillaria elongata'),
	('dionaea-muscipula', 'plantas-populares', 'Dionea', 'Você cadastrou uma Dionéia no seu jardim, a carnívora mais fofa da coleção.', '{"size": 32, "pixels": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 1, 1, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 1, 3, 3, 3, 3, 2, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 3, 3, 3, 3, 3, 4, 4, 3, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 2, 3, 3, 3, 4, 4, 2, 3, 3, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 3, 3, 3, 4, 1, 5, 3, 3, 3, 3, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 2, 3, 3, 3, 4, 4, 2, 5, 3, 3, 3, 4, 4, 2, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 3, 1, 2, 1, 4, 1, 1, 1, 5, 1, 1, 4, 1, 2, 1, 3, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 3, 3, 2, 5, 1, 0, 1, 5, 1, 5, 5, 2, 3, 3, 3, 3, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 3, 3, 3, 4, 1, 1, 5, 1, 1, 5, 1, 5, 1, 1, 3, 3, 3, 3, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 4, 4, 2, 1, 5, 1, 1, 5, 1, 5, 1, 2, 3, 3, 3, 4, 4, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 4, 1, 1, 1, 1, 5, 5, 1, 5, 1, 5, 1, 1, 1, 1, 4, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 1, 1, 0, 1, 5, 1, 5, 5, 1, 0, 1, 1, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 5, 1, 1, 5, 1, 5, 5, 1, 1, 5, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 5, 1, 5, 1, 5, 5, 1, 5, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 5, 5, 5, 5, 5, 5, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 5, 5, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 5, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 6, 7, 7, 6, 7, 7, 6, 7, 7, 6, 7, 7, 6, 7, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 10, 10, 10, 10, 10, 10, 9, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "palette": [null, "#26301F", "#7CC47E", "#C8323A", "#8E1F28", "#4E9A5F", "#35241A", "#4A3222", "#A6724F", "#6C442D", "#8A5A3C"]}', 19, true, 'Dionaea muscipula'),
	('streak-30-dias', 'conquistas', 'Fogo constante', 'Você cuidou das suas plantas por 30 dias seguidos.', '{"size": 32, "pixels": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 1, 1, 0, 0, 0, 0, 1, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 1, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 4, 4, 4, 4, 4, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 4, 4, 4, 4, 4, 4, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 4, 4, 4, 4, 4, 4, 4, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 4, 4, 2, 2, 2, 2, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 4, 4, 4, 4, 4, 4, 4, 4, 2, 2, 2, 2, 1, 0, 0, 1, 3, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 2, 2, 2, 4, 4, 4, 4, 4, 4, 4, 4, 4, 2, 2, 2, 2, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 3, 1, 0, 1, 2, 2, 2, 4, 4, 4, 3, 3, 3, 3, 4, 4, 4, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 2, 2, 2, 2, 4, 4, 3, 3, 3, 3, 3, 4, 4, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 4, 4, 3, 3, 3, 3, 3, 4, 4, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 4, 4, 3, 3, 3, 3, 3, 4, 4, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 4, 4, 4, 3, 3, 3, 3, 4, 4, 4, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 4, 4, 4, 3, 3, 3, 3, 4, 4, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 4, 4, 4, 3, 3, 3, 3, 4, 4, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 4, 4, 3, 3, 3, 3, 4, 4, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 4, 4, 3, 3, 3, 3, 4, 4, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 4, 3, 3, 3, 3, 4, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 4, 4, 3, 3, 4, 4, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "palette": [null, "#26301F", "#C23B22", "#F7D25A", "#E4572E"]}', 1, true, NULL),
	('primeira-troca', 'conquistas', 'Primeira troca', 'Você concluiu sua primeira troca de planta.', '{"size": 32, "pixels": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 3, 3, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 3, 3, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 4, 4, 3, 3, 3, 3, 4, 1, 0, 0, 0, 0, 1, 4, 4, 4, 3, 3, 3, 3, 4, 1, 0, 0, 0, 0, 0, 0, 0, 1, 4, 4, 4, 4, 5, 3, 4, 4, 1, 0, 0, 0, 0, 1, 4, 4, 4, 4, 5, 3, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 5, 5, 6, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 4, 5, 5, 6, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 6, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 6, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 7, 7, 7, 7, 7, 6, 7, 7, 7, 7, 7, 1, 0, 1, 8, 8, 8, 8, 8, 6, 8, 8, 8, 8, 8, 1, 0, 0, 0, 0, 0, 0, 1, 9, 9, 9, 9, 9, 9, 9, 7, 7, 1, 0, 0, 0, 1, 10, 10, 10, 10, 10, 10, 10, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 1, 9, 9, 9, 9, 9, 9, 9, 7, 7, 1, 0, 0, 0, 1, 10, 10, 10, 10, 10, 10, 10, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 1, 9, 9, 9, 9, 9, 9, 9, 7, 7, 1, 0, 0, 0, 1, 10, 10, 10, 10, 10, 10, 10, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 9, 9, 9, 9, 7, 7, 1, 0, 0, 0, 0, 0, 1, 10, 10, 10, 10, 10, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 9, 9, 9, 9, 7, 7, 1, 0, 0, 0, 0, 0, 1, 10, 10, 10, 10, 10, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 9, 9, 9, 9, 7, 7, 1, 0, 0, 0, 0, 0, 1, 10, 10, 10, 10, 10, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 9, 9, 7, 7, 1, 0, 0, 0, 0, 0, 0, 0, 1, 10, 10, 10, 8, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "palette": [null, "#26301F", "#D4AF37", "#7CC47E", "#4E9A5F", "#2F6B3F", "#3D6B2F", "#A4553A", "#2C5382", "#C8704C", "#3E6FA3"]}', 2, true, NULL);

INSERT INTO "public"."credit_costs" ("reason", "cost") VALUES
	('identification', 2),
	('diagnosis', 5),
	('growth_check', 3),
	('chat_question', 1),
	('boost_content', 20);

INSERT INTO "public"."credit_packs" ("id", "name", "credits", "sort_order") VALUES
	('credits_30', 'Pacote Broto', 30, 1),
	('credits_80', 'Pacote Verde', 80, 2),
	('credits_200', 'Pacote Floresta', 200, 3),
	('credits_500', 'Pacote Jardim', 500, 4);

INSERT INTO "public"."plans" ("id", "name", "description", "monthly_credits", "revenuecat_entitlement_id", "sort_order", "credit_renewal_period", "max_listing_photos") VALUES
	('premium', 'Broto+', '40 créditos por semana para identificar, diagnosticar e cuidar das suas plantas · anúncios e eventos ilimitados', 40, 'broto_prod', 2, 'weekly', 8),
	('premium_annual', 'Broto+ Anual', '40 créditos por semana para identificar, diagnosticar e cuidar das suas plantas · anúncios e eventos ilimitados · preço travado por 12 meses', 40, 'broto_prod', 3, 'weekly', 8),
	('free', 'Plano Gratuito', '15 créditos por semana para identificar, diagnosticar e cuidar das suas plantas · anúncios e eventos ilimitados', 15, NULL, 1, 'weekly', 3);
