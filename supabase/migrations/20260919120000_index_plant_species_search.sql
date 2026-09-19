


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "unaccent" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






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


ALTER FUNCTION "public"."boost_content"("p_content_type" "text", "p_content_id" "uuid") OWNER TO "postgres";


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


ALTER FUNCTION "public"."cascade_plant_group_soft_delete"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."cascade_plant_soft_delete"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."cascade_soft_delete_comments"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_event_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_max integer;
  v_count integer;
begin
  select p.max_events_per_month into v_max
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.user_id = new.user_id;

  if not found then
    raise exception 'no_subscription';
  end if;

  if v_max is null then
    return new;
  end if;

  select count(*) into v_count
  from public.events
  where user_id = new.user_id
    and deleted_at is null
    and created_at >= date_trunc('month', now());

  if v_count >= v_max then
    raise exception 'event_limit_reached';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."check_event_limit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_listing_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_max integer;
  v_active_count integer;
begin
  select p.max_active_listings into v_max
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.user_id = new.user_id;

  if not found then
    raise exception 'no_subscription';
  end if;

  if v_max is null then
    return new;
  end if;

  select count(*) into v_active_count
  from public.plant_listings
  where user_id = new.user_id and status = 'available' and deleted_at is null;

  if v_active_count >= v_max then
    raise exception 'listing_limit_reached';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."check_listing_limit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."consume_credit"("credit_reason" "text" DEFAULT 'identification'::"text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_monthly_credits integer;
  v_balance integer;
  v_cost integer;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));

  v_cost := case credit_reason
    when 'identification' then 2
    when 'diagnosis' then 5
    when 'growth_check' then 3
    when 'chat_question' then 1
    when 'boost_content' then 20
    else null
  end;

  if v_cost is null then
    raise exception 'invalid_credit_reason';
  end if;

  select p.monthly_credits into v_monthly_credits
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.user_id = auth.uid();

  if not found then
    raise exception 'no_subscription';
  end if;

  if v_monthly_credits is null then
    return null;
  end if;

  select public.get_credit_balance(auth.uid()) into v_balance;

  if v_balance < v_cost then
    raise exception 'insufficient_credits';
  end if;

  insert into public.credit_ledger (user_id, amount, reason)
  values (auth.uid(), -v_cost, credit_reason);

  return public.get_credit_balance(auth.uid());
end;
$$;


ALTER FUNCTION "public"."consume_credit"("credit_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_credit_balance"("target_user_id" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(sum(amount), 0)::integer
  from public.credit_ledger
  where user_id = target_user_id;
$$;


ALTER FUNCTION "public"."get_credit_balance"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_credits"() RETURNS TABLE("plan_id" "text", "plan_name" "text", "monthly_credits" integer, "balance" integer, "credit_renewal_period" "text", "max_active_listings" integer, "max_events_per_month" integer, "max_listing_photos" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select p.id, p.name, p.monthly_credits,
    case when p.monthly_credits is null then null
         else public.get_credit_balance(auth.uid())
    end as balance,
    p.credit_renewal_period,
    p.max_active_listings,
    p.max_events_per_month,
    p.max_listing_photos
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.user_id = auth.uid();
$$;


ALTER FUNCTION "public"."get_my_credits"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_plan_credit_balance"("target_user_id" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select greatest(0, coalesce(sum(amount), 0))::integer
  from public.credit_ledger
  where user_id = target_user_id
    and reason in ('monthly_grant', 'weekly_grant', 'identification', 'diagnosis', 'growth_check', 'chat_question');
$$;


ALTER FUNCTION "public"."get_plan_credit_balance"("target_user_id" "uuid") OWNER TO "postgres";


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


ALTER FUNCTION "public"."grant_badge"("p_user_id" "uuid", "p_badge_id" "text", "p_source" "text") OWNER TO "postgres";


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


ALTER FUNCTION "public"."grant_credits"("target_user_id" "uuid", "credit_amount" integer, "grant_reason" "text") OWNER TO "postgres";


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


ALTER FUNCTION "public"."grant_species_badge"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."handle_new_comment"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."handle_new_like"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_listing_message"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.notifications (user_id, actor_id, type, listing_id)
  values (new.recipient_id, new.sender_id, 'listing_message', null);

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_listing_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_listing_proposal"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.notifications (user_id, actor_id, type, listing_id)
  values (new.recipient_id, new.sender_id, 'listing_message', new.listing_id);

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_listing_proposal"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."handle_new_user_subscription"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_notification_created_push"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
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


ALTER FUNCTION "public"."handle_notification_created_push"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."immutable_array_to_string"("text"[], "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE STRICT PARALLEL SAFE
    AS $_$
  SELECT array_to_string($1, $2);
$_$;


ALTER FUNCTION "public"."immutable_array_to_string"("text"[], "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."immutable_unaccent"("text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE STRICT PARALLEL SAFE
    AS $_$
  SELECT public.unaccent('public.unaccent'::regdictionary, $1);
$_$;


ALTER FUNCTION "public"."immutable_unaccent"("text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_conversation_read"("p_other_user_id" "uuid") RETURNS "void"
    LANGUAGE "sql"
    SET "search_path" TO 'public'
    AS $$
  insert into public.chat_reads (user_id, other_user_id, last_read_at)
  values (auth.uid(), p_other_user_id, now())
  on conflict (user_id, other_user_id) do update set last_read_at = now();
$$;


ALTER FUNCTION "public"."mark_conversation_read"("p_other_user_id" "uuid") OWNER TO "postgres";


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


ALTER FUNCTION "public"."prevent_attendance_on_closed_event"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."register_push_token"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."renew_all_subscriptions"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  sub record;
  v_current_balance integer;
  v_topup_amount integer;
begin
  -- Seleciona todos os usuários que:
  -- 1. Tem um plano com renovação semanal
  -- 2. Passaram-se 7 dias (ou mais) desde a última renovação (ou desde o cadastro/inserção do default)
  for sub in 
    select s.id as subscription_id, s.user_id, p.monthly_credits
    from public.subscriptions s
    join public.plans p on p.id = s.plan_id
    where p.credit_renewal_period = 'weekly'
      and s.last_renewal_at <= now() - interval '7 days'
  loop
    -- Verifica o saldo atual do usuário
    select public.get_credit_balance(sub.user_id) into v_current_balance;
    
    -- Calcula quanto precisa para bater o teto da cota semanal (Top-Up)
    v_topup_amount := sub.monthly_credits - v_current_balance;
    
    -- Só insere crédito se ele estiver abaixo do limite semanal
    if v_topup_amount > 0 then
      insert into public.credit_ledger (user_id, amount, reason)
      values (sub.user_id, v_topup_amount, 'weekly_grant');
    end if;
    
    -- Atualiza a data de renovação independentemente de ter inserido saldo ou não
    -- (ex: ele pode ter 200 de saldo por ter comprado pacote avulso, não recebe saldo agora mas a data reseta)
    update public.subscriptions 
    set last_renewal_at = now() 
    where id = sub.subscription_id;
  end loop;
end;
$$;


ALTER FUNCTION "public"."renew_all_subscriptions"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."reset_credits_to_plan"("target_user_id" "uuid", "target_balance" integer, "grant_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_weekly_plan_credits"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_row record;
begin
  for v_row in
    select s.user_id, p.monthly_credits as target_balance
    from public.subscriptions s
    join public.plans p on p.id = s.plan_id
    where p.credit_renewal_period = 'weekly'
      and s.status = 'active'
      and p.monthly_credits is not null
  loop
    perform public.reset_credits_to_plan(v_row.user_id, v_row.target_balance, 'weekly_grant');
  end loop;
end;
$$;


ALTER FUNCTION "public"."reset_weekly_plan_credits"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."plant_species_info" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "scientific_name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "watering_description" "text" NOT NULL,
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
    "common_names" "text"[] DEFAULT '{}'::"text"[],
    CONSTRAINT "plant_species_info_care_level_check" CHECK (("care_level" = ANY (ARRAY['easy'::"text", 'moderate'::"text", 'hard'::"text"]))),
    CONSTRAINT "plant_species_info_sun_level_check" CHECK (("sun_level" = ANY (ARRAY['shade'::"text", 'partial_shade'::"text", 'medium'::"text", 'bright_indirect'::"text", 'full_sun'::"text"])))
);


ALTER TABLE "public"."plant_species_info" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_plant_species"("search_query" "text") RETURNS SETOF "public"."plant_species_info"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "pg_trgm.similarity_threshold" TO '0.15'
    AS $$
DECLARE
  normalized_term TEXT;
BEGIN
  normalized_term := immutable_unaccent(search_query);

  RETURN QUERY
  SELECT *
  FROM plant_species_info
  WHERE
    immutable_unaccent(scientific_name) ILIKE '%' || normalized_term || '%'
    OR immutable_unaccent(immutable_array_to_string(common_names, ' ')) ILIKE '%' || normalized_term || '%'
    OR immutable_unaccent(scientific_name) % normalized_term
    OR immutable_unaccent(immutable_array_to_string(common_names, ' ')) % normalized_term
  ORDER BY
    GREATEST(
      CASE WHEN immutable_unaccent(scientific_name) ILIKE normalized_term || '%' THEN 1.0 ELSE 0.0 END,
      similarity(immutable_unaccent(scientific_name), normalized_term),
      similarity(immutable_unaccent(immutable_array_to_string(common_names, ' ')), normalized_term)
    ) DESC
  LIMIT 10;
END;
$$;


ALTER FUNCTION "public"."search_plant_species"("search_query" "text") OWNER TO "postgres";


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


ALTER FUNCTION "public"."set_proposal_responded_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_versions" (
    "platform" "text" NOT NULL,
    "latest_version_code" integer NOT NULL,
    "store_url" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "app_versions_platform_check" CHECK (("platform" = ANY (ARRAY['android'::"text", 'ios'::"text"])))
);


ALTER TABLE "public"."app_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."badge_batches" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."badge_batches" OWNER TO "postgres";


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


ALTER TABLE "public"."badges" OWNER TO "postgres";


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
    CONSTRAINT "care_tasks_recurrence_days_check" CHECK ((("recurrence_days" IS NULL) OR ("recurrence_days" > 0))),
    CONSTRAINT "care_tasks_reminder_hour_check" CHECK ((("reminder_hour" >= 0) AND ("reminder_hour" <= 23))),
    CONSTRAINT "care_tasks_reminder_minute_check" CHECK ((("reminder_minute" >= 0) AND ("reminder_minute" <= 59)))
);


ALTER TABLE "public"."care_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sender_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "plant_listing_messages_check" CHECK (("recipient_id" <> "sender_id"))
);


ALTER TABLE "public"."chat_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_reads" (
    "user_id" "uuid" NOT NULL,
    "other_user_id" "uuid" NOT NULL,
    "last_read_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."chat_reads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."credit_ledger" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" integer NOT NULL,
    "reason" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "credit_ledger_reason_check" CHECK (("reason" = ANY (ARRAY['monthly_grant'::"text", 'weekly_grant'::"text", 'identification'::"text", 'diagnosis'::"text", 'growth_check'::"text", 'chat_question'::"text", 'purchase'::"text", 'adjustment'::"text", 'boost_content'::"text"])))
);


ALTER TABLE "public"."credit_ledger" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."credit_packs" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "credits" integer NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "credit_packs_credits_check" CHECK (("credits" > 0))
);


ALTER TABLE "public"."credit_packs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_attendees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."event_attendees" OWNER TO "postgres";


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


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."follows" (
    "follower_id" "uuid" NOT NULL,
    "following_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "follows_check" CHECK (("follower_id" <> "following_id"))
);


ALTER TABLE "public"."follows" OWNER TO "postgres";


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
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['system'::"text", 'like'::"text", 'comment'::"text", 'listing_interest'::"text", 'listing_message'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plans" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "monthly_credits" integer,
    "revenuecat_entitlement_id" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "credit_renewal_period" "text" DEFAULT 'monthly'::"text" NOT NULL,
    "max_active_listings" integer,
    "max_events_per_month" integer,
    "max_listing_photos" integer,
    CONSTRAINT "plans_credit_renewal_period_check" CHECK (("credit_renewal_period" = ANY (ARRAY['weekly'::"text", 'monthly'::"text"])))
);


ALTER TABLE "public"."plans" OWNER TO "postgres";


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


ALTER TABLE "public"."plant_chat_messages" OWNER TO "postgres";


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


ALTER TABLE "public"."plant_diagnoses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plant_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."plant_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plant_growth_checkins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "photo_url" "text" NOT NULL,
    "observations" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."plant_growth_checkins" OWNER TO "postgres";


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


ALTER TABLE "public"."plant_listing_proposals" OWNER TO "postgres";


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
    CONSTRAINT "plant_listings_listing_type_check" CHECK (("listing_type" = ANY (ARRAY['donation'::"text", 'exchange'::"text", 'discard'::"text", 'sale'::"text"]))),
    CONSTRAINT "plant_listings_photo_urls_max_check" CHECK (("cardinality"("photo_urls") <= 5)),
    CONSTRAINT "plant_listings_price_cents_check" CHECK (((("listing_type" = 'sale'::"text") AND ("price_cents" IS NOT NULL) AND ("price_cents" > 0)) OR (("listing_type" <> 'sale'::"text") AND ("price_cents" IS NULL)))),
    CONSTRAINT "plant_listings_status_check" CHECK (("status" = ANY (ARRAY['available'::"text", 'completed'::"text", 'cancelled'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."plant_listings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "name" "text" NOT NULL,
    "species" "text",
    "common_name" "text",
    "watering_days" integer,
    "origin" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sun_level" "text",
    "description" "text",
    "watering_description" "text",
    "care_level" "text",
    "toxic_to_pets" boolean,
    "toxic_to_pets_notes" "text",
    "toxic_to_humans" boolean,
    "toxic_to_humans_notes" "text",
    "fun_facts" "text"[],
    "common_problems" "jsonb",
    "photo_urls" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "deleted_at" timestamp with time zone,
    "group_id" "uuid",
    CONSTRAINT "plants_care_level_check" CHECK (("care_level" = ANY (ARRAY['easy'::"text", 'moderate'::"text", 'hard'::"text"]))),
    CONSTRAINT "plants_photo_urls_max_check" CHECK (("cardinality"("photo_urls") <= 5)),
    CONSTRAINT "plants_sun_level_check" CHECK (("sun_level" = ANY (ARRAY['shade'::"text", 'partial_shade'::"text", 'medium'::"text", 'bright_indirect'::"text", 'full_sun'::"text"]))),
    CONSTRAINT "plants_watering_days_check" CHECK ((("watering_days" IS NULL) OR ("watering_days" > 0)))
);


ALTER TABLE "public"."plants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."post_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_likes" (
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."post_likes" OWNER TO "postgres";


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


ALTER TABLE "public"."posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "username" "text" NOT NULL,
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "text" NOT NULL,
    "token" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."push_tickets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."push_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."revenuecat_processed_events" (
    "event_id" "text" NOT NULL,
    "processed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."revenuecat_processed_events" OWNER TO "postgres";


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


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_badges" (
    "user_id" "uuid" NOT NULL,
    "badge_id" "text" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source" "text" NOT NULL
);


ALTER TABLE "public"."user_badges" OWNER TO "postgres";


ALTER TABLE ONLY "public"."app_versions"
    ADD CONSTRAINT "app_versions_pkey" PRIMARY KEY ("platform");



ALTER TABLE ONLY "public"."badge_batches"
    ADD CONSTRAINT "badge_batches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."badges"
    ADD CONSTRAINT "badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."care_tasks"
    ADD CONSTRAINT "care_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_reads"
    ADD CONSTRAINT "chat_reads_pkey" PRIMARY KEY ("user_id", "other_user_id");



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



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_pkey" PRIMARY KEY ("user_id", "badge_id");



CREATE INDEX "badges_batch_id_idx" ON "public"."badges" USING "btree" ("batch_id");



CREATE INDEX "care_tasks_plant_id_idx" ON "public"."care_tasks" USING "btree" ("plant_id");



CREATE INDEX "care_tasks_user_id_idx" ON "public"."care_tasks" USING "btree" ("user_id");



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



CREATE INDEX "plant_species_info_common_names_trgm_idx" ON "public"."plant_species_info" USING "gin" ("public"."immutable_unaccent"("public"."immutable_array_to_string"("common_names", ' '::"text")) "public"."gin_trgm_ops");



CREATE INDEX "plant_species_info_scientific_name_trgm_idx" ON "public"."plant_species_info" USING "gin" ("public"."immutable_unaccent"("scientific_name") "public"."gin_trgm_ops");



CREATE INDEX "plants_group_id_idx" ON "public"."plants" USING "btree" ("group_id");



CREATE INDEX "plants_user_id_idx" ON "public"."plants" USING "btree" ("user_id");



CREATE INDEX "post_comments_post_id_idx" ON "public"."post_comments" USING "btree" ("post_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "posts_feed_idx" ON "public"."posts" USING "btree" ("created_at" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "posts_user_id_idx" ON "public"."posts" USING "btree" ("user_id");



CREATE INDEX "profiles_username_trgm_idx" ON "public"."profiles" USING "gin" ("username" "public"."gin_trgm_ops");



CREATE INDEX "push_tickets_created_at_idx" ON "public"."push_tickets" USING "btree" ("created_at");



CREATE INDEX "push_tokens_user_id_idx" ON "public"."push_tokens" USING "btree" ("user_id");



CREATE INDEX "user_badges_user_id_idx" ON "public"."user_badges" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "app_versions_set_updated_at" BEFORE UPDATE ON "public"."app_versions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "check_event_limit_before_insert" BEFORE INSERT ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."check_event_limit"();



CREATE OR REPLACE TRIGGER "check_listing_limit_before_insert" BEFORE INSERT ON "public"."plant_listings" FOR EACH ROW EXECUTE FUNCTION "public"."check_listing_limit"();



CREATE OR REPLACE TRIGGER "grant_species_badge_on_plant_insert" AFTER INSERT ON "public"."plants" FOR EACH ROW EXECUTE FUNCTION "public"."grant_species_badge"();



CREATE OR REPLACE TRIGGER "on_comment_created" AFTER INSERT ON "public"."post_comments" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_comment"();



CREATE OR REPLACE TRIGGER "on_like_created" AFTER INSERT ON "public"."post_likes" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_like"();



CREATE OR REPLACE TRIGGER "on_listing_message_created" AFTER INSERT ON "public"."chat_messages" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_listing_message"();



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



ALTER TABLE ONLY "public"."care_tasks"
    ADD CONSTRAINT "care_tasks_plant_id_fkey" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."care_tasks"
    ADD CONSTRAINT "care_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_reads"
    ADD CONSTRAINT "chat_reads_other_user_id_fkey" FOREIGN KEY ("other_user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_reads"
    ADD CONSTRAINT "chat_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



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



CREATE POLICY "Anyone can view available listings" ON "public"."plant_listings" FOR SELECT USING (((("deleted_at" IS NULL) AND ("status" = 'available'::"text")) OR ("user_id" = "auth"."uid"())));



CREATE POLICY "Anyone can view badge batches" ON "public"."badge_batches" FOR SELECT USING (true);



CREATE POLICY "Anyone can view badges" ON "public"."badges" FOR SELECT USING (true);



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



CREATE POLICY "Users can view their own care tasks" ON "public"."care_tasks" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own chat reads" ON "public"."chat_reads" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own credit ledger" ON "public"."credit_ledger" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own diagnoses" ON "public"."plant_diagnoses" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own growth checkins" ON "public"."plant_growth_checkins" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own plant chat messages" ON "public"."plant_chat_messages" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own plant groups" ON "public"."plant_groups" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own plants" ON "public"."plants" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own push tokens" ON "public"."push_tokens" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own subscription" ON "public"."subscriptions" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."app_versions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."badge_batches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."badges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."care_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_reads" ENABLE ROW LEVEL SECURITY;


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


ALTER TABLE "public"."push_tickets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."revenuecat_processed_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_badges" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."chat_messages";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notifications";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."plant_listing_proposals";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."post_comments";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."post_likes";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."posts";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";

















































































































































































GRANT ALL ON FUNCTION "public"."boost_content"("p_content_type" "text", "p_content_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."boost_content"("p_content_type" "text", "p_content_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."boost_content"("p_content_type" "text", "p_content_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cascade_plant_group_soft_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."cascade_plant_group_soft_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cascade_plant_group_soft_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cascade_plant_soft_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."cascade_plant_soft_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cascade_plant_soft_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cascade_soft_delete_comments"() TO "anon";
GRANT ALL ON FUNCTION "public"."cascade_soft_delete_comments"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cascade_soft_delete_comments"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_event_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_event_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_event_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_listing_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_listing_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_listing_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."consume_credit"("credit_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."consume_credit"("credit_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."consume_credit"("credit_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_credit_balance"("target_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_credit_balance"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_credit_balance"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_credit_balance"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_credits"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_credits"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_credits"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_plan_credit_balance"("target_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_plan_credit_balance"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_plan_credit_balance"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_plan_credit_balance"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."grant_badge"("p_user_id" "uuid", "p_badge_id" "text", "p_source" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."grant_badge"("p_user_id" "uuid", "p_badge_id" "text", "p_source" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."grant_badge"("p_user_id" "uuid", "p_badge_id" "text", "p_source" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."grant_credits"("target_user_id" "uuid", "credit_amount" integer, "grant_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."grant_credits"("target_user_id" "uuid", "credit_amount" integer, "grant_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."grant_credits"("target_user_id" "uuid", "credit_amount" integer, "grant_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."grant_credits"("target_user_id" "uuid", "credit_amount" integer, "grant_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."grant_species_badge"() TO "anon";
GRANT ALL ON FUNCTION "public"."grant_species_badge"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."grant_species_badge"() TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_comment"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_comment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_comment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_like"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_like"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_like"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_listing_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_listing_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_listing_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_listing_proposal"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_listing_proposal"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_listing_proposal"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_subscription"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_subscription"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_subscription"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_notification_created_push"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_notification_created_push"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_notification_created_push"() TO "service_role";



GRANT ALL ON FUNCTION "public"."immutable_array_to_string"("text"[], "text") TO "anon";
GRANT ALL ON FUNCTION "public"."immutable_array_to_string"("text"[], "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."immutable_array_to_string"("text"[], "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."immutable_unaccent"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."immutable_unaccent"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."immutable_unaccent"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_conversation_read"("p_other_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_conversation_read"("p_other_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_conversation_read"("p_other_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_attendance_on_closed_event"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_attendance_on_closed_event"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_attendance_on_closed_event"() TO "service_role";



GRANT ALL ON FUNCTION "public"."register_push_token"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."register_push_token"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_push_token"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."renew_all_subscriptions"() TO "anon";
GRANT ALL ON FUNCTION "public"."renew_all_subscriptions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."renew_all_subscriptions"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."reset_credits_to_plan"("target_user_id" "uuid", "target_balance" integer, "grant_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reset_credits_to_plan"("target_user_id" "uuid", "target_balance" integer, "grant_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."reset_credits_to_plan"("target_user_id" "uuid", "target_balance" integer, "grant_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_credits_to_plan"("target_user_id" "uuid", "target_balance" integer, "grant_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."reset_weekly_plan_credits"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reset_weekly_plan_credits"() TO "anon";
GRANT ALL ON FUNCTION "public"."reset_weekly_plan_credits"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_weekly_plan_credits"() TO "service_role";



GRANT ALL ON TABLE "public"."plant_species_info" TO "anon";
GRANT ALL ON TABLE "public"."plant_species_info" TO "authenticated";
GRANT ALL ON TABLE "public"."plant_species_info" TO "service_role";



GRANT ALL ON FUNCTION "public"."search_plant_species"("search_query" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."search_plant_species"("search_query" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_plant_species"("search_query" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_proposal_responded_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_proposal_responded_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_proposal_responded_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";
























GRANT ALL ON TABLE "public"."app_versions" TO "anon";
GRANT ALL ON TABLE "public"."app_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."app_versions" TO "service_role";



GRANT ALL ON TABLE "public"."badge_batches" TO "anon";
GRANT ALL ON TABLE "public"."badge_batches" TO "authenticated";
GRANT ALL ON TABLE "public"."badge_batches" TO "service_role";



GRANT ALL ON TABLE "public"."badges" TO "anon";
GRANT ALL ON TABLE "public"."badges" TO "authenticated";
GRANT ALL ON TABLE "public"."badges" TO "service_role";



GRANT ALL ON TABLE "public"."care_tasks" TO "anon";
GRANT ALL ON TABLE "public"."care_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."care_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."chat_reads" TO "anon";
GRANT ALL ON TABLE "public"."chat_reads" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_reads" TO "service_role";



GRANT ALL ON TABLE "public"."credit_ledger" TO "anon";
GRANT ALL ON TABLE "public"."credit_ledger" TO "authenticated";
GRANT ALL ON TABLE "public"."credit_ledger" TO "service_role";



GRANT ALL ON TABLE "public"."credit_packs" TO "anon";
GRANT ALL ON TABLE "public"."credit_packs" TO "authenticated";
GRANT ALL ON TABLE "public"."credit_packs" TO "service_role";



GRANT ALL ON TABLE "public"."event_attendees" TO "anon";
GRANT ALL ON TABLE "public"."event_attendees" TO "authenticated";
GRANT ALL ON TABLE "public"."event_attendees" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."follows" TO "anon";
GRANT ALL ON TABLE "public"."follows" TO "authenticated";
GRANT ALL ON TABLE "public"."follows" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."plans" TO "anon";
GRANT ALL ON TABLE "public"."plans" TO "authenticated";
GRANT ALL ON TABLE "public"."plans" TO "service_role";



GRANT ALL ON TABLE "public"."plant_chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."plant_chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."plant_chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."plant_diagnoses" TO "anon";
GRANT ALL ON TABLE "public"."plant_diagnoses" TO "authenticated";
GRANT ALL ON TABLE "public"."plant_diagnoses" TO "service_role";



GRANT ALL ON TABLE "public"."plant_groups" TO "anon";
GRANT ALL ON TABLE "public"."plant_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."plant_groups" TO "service_role";



GRANT ALL ON TABLE "public"."plant_growth_checkins" TO "anon";
GRANT ALL ON TABLE "public"."plant_growth_checkins" TO "authenticated";
GRANT ALL ON TABLE "public"."plant_growth_checkins" TO "service_role";



GRANT ALL ON TABLE "public"."plant_listing_proposals" TO "anon";
GRANT ALL ON TABLE "public"."plant_listing_proposals" TO "authenticated";
GRANT ALL ON TABLE "public"."plant_listing_proposals" TO "service_role";



GRANT ALL ON TABLE "public"."plant_listings" TO "anon";
GRANT ALL ON TABLE "public"."plant_listings" TO "authenticated";
GRANT ALL ON TABLE "public"."plant_listings" TO "service_role";



GRANT ALL ON TABLE "public"."plants" TO "anon";
GRANT ALL ON TABLE "public"."plants" TO "authenticated";
GRANT ALL ON TABLE "public"."plants" TO "service_role";



GRANT ALL ON TABLE "public"."post_comments" TO "anon";
GRANT ALL ON TABLE "public"."post_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."post_comments" TO "service_role";



GRANT ALL ON TABLE "public"."post_likes" TO "anon";
GRANT ALL ON TABLE "public"."post_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."post_likes" TO "service_role";



GRANT ALL ON TABLE "public"."posts" TO "anon";
GRANT ALL ON TABLE "public"."posts" TO "authenticated";
GRANT ALL ON TABLE "public"."posts" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."push_tickets" TO "anon";
GRANT ALL ON TABLE "public"."push_tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."push_tickets" TO "service_role";



GRANT ALL ON TABLE "public"."push_tokens" TO "anon";
GRANT ALL ON TABLE "public"."push_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."push_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."revenuecat_processed_events" TO "anon";
GRANT ALL ON TABLE "public"."revenuecat_processed_events" TO "authenticated";
GRANT ALL ON TABLE "public"."revenuecat_processed_events" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."user_badges" TO "anon";
GRANT ALL ON TABLE "public"."user_badges" TO "authenticated";
GRANT ALL ON TABLE "public"."user_badges" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
































--
-- Dumped schema changes for auth and storage
--

CREATE OR REPLACE TRIGGER "on_auth_user_created" AFTER INSERT ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();



CREATE OR REPLACE TRIGGER "on_auth_user_created_subscription" AFTER INSERT ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user_subscription"();



CREATE POLICY "Avatars images are publicly accessible." ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'avatars'::"text"));



CREATE POLICY "Plant photos are publicly readable" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'plant-photos'::"text"));



CREATE POLICY "Post images are publicly accessible." ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'posts'::"text"));



CREATE POLICY "Users can delete their own avatar." ON "storage"."objects" FOR DELETE USING ((("bucket_id" = 'avatars'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));



CREATE POLICY "Users can delete their own plant photos" ON "storage"."objects" FOR DELETE USING ((("bucket_id" = 'plant-photos'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));



CREATE POLICY "Users can delete their own post images." ON "storage"."objects" FOR DELETE USING ((("bucket_id" = 'posts'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));



CREATE POLICY "Users can update their own avatar." ON "storage"."objects" FOR UPDATE USING ((("bucket_id" = 'avatars'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));



CREATE POLICY "Users can update their own plant photos" ON "storage"."objects" FOR UPDATE USING ((("bucket_id" = 'plant-photos'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));



CREATE POLICY "Users can upload their own avatar." ON "storage"."objects" FOR INSERT WITH CHECK ((("bucket_id" = 'avatars'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));



CREATE POLICY "Users can upload their own plant photos" ON "storage"."objects" FOR INSERT WITH CHECK ((("bucket_id" = 'plant-photos'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));



CREATE POLICY "Users can upload their own post images." ON "storage"."objects" FOR INSERT WITH CHECK ((("bucket_id" = 'posts'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));



