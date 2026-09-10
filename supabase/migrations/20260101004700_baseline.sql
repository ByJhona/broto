


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






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






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
    when 'diagnosis' then 4
    when 'growth_check' then 2
    when 'chat_question' then 1
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


CREATE OR REPLACE FUNCTION "public"."get_my_credits"() RETURNS TABLE("plan_id" "text", "plan_name" "text", "monthly_credits" integer, "balance" integer, "credit_renewal_period" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select p.id, p.name, p.monthly_credits,
    case when p.monthly_credits is null then null
         else public.get_credit_balance(auth.uid())
    end as balance,
    p.credit_renewal_period
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


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (id, name, username, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'avatar_url'
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

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."app_versions" (
    "platform" "text" NOT NULL,
    "latest_version_code" integer NOT NULL,
    "store_url" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "app_versions_platform_check" CHECK (("platform" = ANY (ARRAY['android'::"text", 'ios'::"text"])))
);


ALTER TABLE "public"."app_versions" OWNER TO "postgres";


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
    CONSTRAINT "care_tasks_recurrence_days_check" CHECK ((("recurrence_days" IS NULL) OR ("recurrence_days" > 0))),
    CONSTRAINT "care_tasks_reminder_hour_check" CHECK ((("reminder_hour" >= 0) AND ("reminder_hour" <= 23)))
);


ALTER TABLE "public"."care_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."credit_ledger" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" integer NOT NULL,
    "reason" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "credit_ledger_reason_check" CHECK (("reason" = ANY (ARRAY['monthly_grant'::"text", 'weekly_grant'::"text", 'identification'::"text", 'diagnosis'::"text", 'growth_check'::"text", 'chat_question'::"text", 'purchase'::"text", 'adjustment'::"text"])))
);


ALTER TABLE "public"."credit_ledger" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."credit_packs" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "credits" integer NOT NULL,
    "price_cents" integer DEFAULT 0 NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "credit_packs_credits_check" CHECK (("credits" > 0))
);


ALTER TABLE "public"."credit_packs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_messages" (
    "message_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."daily_messages" OWNER TO "postgres";


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
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['system'::"text", 'like'::"text", 'comment'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plans" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "price_cents" integer DEFAULT 0 NOT NULL,
    "monthly_credits" integer,
    "revenuecat_entitlement_id" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "credit_renewal_period" "text" DEFAULT 'monthly'::"text" NOT NULL,
    CONSTRAINT "plans_credit_renewal_period_check" CHECK (("credit_renewal_period" = ANY (ARRAY['weekly'::"text", 'monthly'::"text"])))
);


ALTER TABLE "public"."plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plant_chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plant_id" "uuid" NOT NULL,
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


CREATE TABLE IF NOT EXISTS "public"."plant_growth_checkins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "photo_url" "text" NOT NULL,
    "observations" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."plant_growth_checkins" OWNER TO "postgres";


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
    CONSTRAINT "plant_species_info_care_level_check" CHECK (("care_level" = ANY (ARRAY['easy'::"text", 'moderate'::"text", 'hard'::"text"]))),
    CONSTRAINT "plant_species_info_sun_level_check" CHECK (("sun_level" = ANY (ARRAY['shade'::"text", 'partial_shade'::"text", 'medium'::"text", 'bright_indirect'::"text", 'full_sun'::"text"])))
);


ALTER TABLE "public"."plant_species_info" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "name" "text" NOT NULL,
    "species" "text",
    "common_name" "text",
    "photo_url" "text",
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
    CONSTRAINT "plants_care_level_check" CHECK (("care_level" = ANY (ARRAY['easy'::"text", 'moderate'::"text", 'hard'::"text"]))),
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
    "image_url" "text",
    "caption" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "post_type" "text",
    "deleted_at" timestamp with time zone,
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
    CONSTRAINT "subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'trialing'::"text", 'canceled'::"text", 'expired'::"text", 'past_due'::"text"])))
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."app_versions"
    ADD CONSTRAINT "app_versions_pkey" PRIMARY KEY ("platform");



ALTER TABLE ONLY "public"."care_tasks"
    ADD CONSTRAINT "care_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."credit_ledger"
    ADD CONSTRAINT "credit_ledger_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."credit_packs"
    ADD CONSTRAINT "credit_packs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_messages"
    ADD CONSTRAINT "daily_messages_pkey" PRIMARY KEY ("message_date");



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



ALTER TABLE ONLY "public"."plant_growth_checkins"
    ADD CONSTRAINT "plant_growth_checkins_pkey" PRIMARY KEY ("id");



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



CREATE INDEX "care_tasks_plant_id_idx" ON "public"."care_tasks" USING "btree" ("plant_id");



CREATE INDEX "care_tasks_user_id_idx" ON "public"."care_tasks" USING "btree" ("user_id");



CREATE INDEX "credit_ledger_user_id_idx" ON "public"."credit_ledger" USING "btree" ("user_id");



CREATE INDEX "follows_following_id_idx" ON "public"."follows" USING "btree" ("following_id");



CREATE INDEX "notifications_actor_id_idx" ON "public"."notifications" USING "btree" ("actor_id");



CREATE INDEX "notifications_post_id_idx" ON "public"."notifications" USING "btree" ("post_id");



CREATE INDEX "plant_chat_messages_session_id_idx" ON "public"."plant_chat_messages" USING "btree" ("plant_id", "session_id", "created_at");



CREATE INDEX "plant_diagnoses_user_id_idx" ON "public"."plant_diagnoses" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "plant_growth_checkins_plant_id_idx" ON "public"."plant_growth_checkins" USING "btree" ("plant_id", "created_at");



CREATE INDEX "plants_user_id_idx" ON "public"."plants" USING "btree" ("user_id");



CREATE INDEX "post_comments_post_id_idx" ON "public"."post_comments" USING "btree" ("post_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "posts_feed_idx" ON "public"."posts" USING "btree" ("created_at" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "posts_user_id_idx" ON "public"."posts" USING "btree" ("user_id");



CREATE INDEX "profiles_username_trgm_idx" ON "public"."profiles" USING "gin" ("username" "public"."gin_trgm_ops");



CREATE INDEX "push_tokens_user_id_idx" ON "public"."push_tokens" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "app_versions_set_updated_at" BEFORE UPDATE ON "public"."app_versions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "on_comment_created" AFTER INSERT ON "public"."post_comments" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_comment"();



CREATE OR REPLACE TRIGGER "on_like_created" AFTER INSERT ON "public"."post_likes" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_like"();



CREATE OR REPLACE TRIGGER "on_notification_created_push" AFTER INSERT ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."handle_notification_created_push"();



CREATE OR REPLACE TRIGGER "on_post_soft_deleted" AFTER UPDATE ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "public"."cascade_soft_delete_comments"();



CREATE OR REPLACE TRIGGER "plant_species_info_set_updated_at" BEFORE UPDATE ON "public"."plant_species_info" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "plants_set_updated_at" BEFORE UPDATE ON "public"."plants" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "post_comments_set_updated_at" BEFORE UPDATE ON "public"."post_comments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "posts_set_updated_at" BEFORE UPDATE ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "profiles_set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "subscriptions_set_updated_at" BEFORE UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."care_tasks"
    ADD CONSTRAINT "care_tasks_plant_id_fkey" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."care_tasks"
    ADD CONSTRAINT "care_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."credit_ledger"
    ADD CONSTRAINT "credit_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



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



ALTER TABLE ONLY "public"."plant_growth_checkins"
    ADD CONSTRAINT "plant_growth_checkins_plant_id_fkey" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plant_growth_checkins"
    ADD CONSTRAINT "plant_growth_checkins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



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
    ADD CONSTRAINT "posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Anyone can view credit packs" ON "public"."credit_packs" FOR SELECT USING (true);



CREATE POLICY "Anyone can view daily messages" ON "public"."daily_messages" FOR SELECT USING (true);



CREATE POLICY "Anyone can view plans" ON "public"."plans" FOR SELECT USING (true);



CREATE POLICY "Anyone can view plant species info" ON "public"."plant_species_info" FOR SELECT USING (true);



CREATE POLICY "App versions are publicly readable" ON "public"."app_versions" FOR SELECT USING (true);



CREATE POLICY "Follows are viewable by everyone" ON "public"."follows" FOR SELECT USING (true);



CREATE POLICY "Plants are viewable by everyone" ON "public"."plants" FOR SELECT USING (true);



CREATE POLICY "Post comments are viewable by everyone" ON "public"."post_comments" FOR SELECT USING ((("deleted_at" IS NULL) OR ("auth"."uid"() = "user_id")));



CREATE POLICY "Post likes are viewable by everyone" ON "public"."post_likes" FOR SELECT USING (true);



CREATE POLICY "Posts are viewable by everyone" ON "public"."posts" FOR SELECT USING ((("deleted_at" IS NULL) OR ("auth"."uid"() = "user_id")));



CREATE POLICY "Public profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Users can delete their own care tasks" ON "public"."care_tasks" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own diagnoses" ON "public"."plant_diagnoses" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own growth checkins" ON "public"."plant_growth_checkins" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own notifications" ON "public"."notifications" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own plants" ON "public"."plants" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own push tokens" ON "public"."push_tokens" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can follow others" ON "public"."follows" FOR INSERT WITH CHECK (("auth"."uid"() = "follower_id"));



CREATE POLICY "Users can insert their own care tasks" ON "public"."care_tasks" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own comments" ON "public"."post_comments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own diagnoses" ON "public"."plant_diagnoses" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own growth checkins" ON "public"."plant_growth_checkins" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own plant chat messages" ON "public"."plant_chat_messages" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."plants"
  WHERE (("plants"."id" = "plant_chat_messages"."plant_id") AND ("plants"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can insert their own plants" ON "public"."plants" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own posts" ON "public"."posts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert their own push tokens" ON "public"."push_tokens" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can like posts" ON "public"."post_likes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can unfollow others" ON "public"."follows" FOR DELETE USING (("auth"."uid"() = "follower_id"));



CREATE POLICY "Users can unlike posts" ON "public"."post_likes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own care tasks" ON "public"."care_tasks" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own comments" ON "public"."post_comments" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own plants" ON "public"."plants" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own posts" ON "public"."posts" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own push tokens" ON "public"."push_tokens" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own care tasks" ON "public"."care_tasks" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own credit ledger" ON "public"."credit_ledger" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own diagnoses" ON "public"."plant_diagnoses" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own growth checkins" ON "public"."plant_growth_checkins" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own plant chat messages" ON "public"."plant_chat_messages" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own plants" ON "public"."plants" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own push tokens" ON "public"."push_tokens" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own subscription" ON "public"."subscriptions" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."app_versions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."care_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."credit_ledger" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."credit_packs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."follows" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plant_chat_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plant_diagnoses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plant_growth_checkins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plant_species_info" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."revenuecat_processed_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notifications";



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

















































































































































































GRANT ALL ON FUNCTION "public"."cascade_soft_delete_comments"() TO "anon";
GRANT ALL ON FUNCTION "public"."cascade_soft_delete_comments"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cascade_soft_delete_comments"() TO "service_role";



GRANT ALL ON FUNCTION "public"."consume_credit"("credit_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."consume_credit"("credit_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."consume_credit"("credit_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_credit_balance"("target_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_credit_balance"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_credits"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_credits"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_credits"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_plan_credit_balance"("target_user_id" "uuid") FROM PUBLIC;
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



REVOKE ALL ON FUNCTION "public"."grant_credits"("target_user_id" "uuid", "credit_amount" integer, "grant_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."grant_credits"("target_user_id" "uuid", "credit_amount" integer, "grant_reason" "text") TO "service_role";



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



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_subscription"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_subscription"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_subscription"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_notification_created_push"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_notification_created_push"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_notification_created_push"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."reset_credits_to_plan"("target_user_id" "uuid", "target_balance" integer, "grant_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reset_credits_to_plan"("target_user_id" "uuid", "target_balance" integer, "grant_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."reset_weekly_plan_credits"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reset_weekly_plan_credits"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



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



GRANT ALL ON TABLE "public"."care_tasks" TO "anon";
GRANT ALL ON TABLE "public"."care_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."care_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."credit_ledger" TO "anon";
GRANT ALL ON TABLE "public"."credit_ledger" TO "authenticated";
GRANT ALL ON TABLE "public"."credit_ledger" TO "service_role";



GRANT ALL ON TABLE "public"."credit_packs" TO "anon";
GRANT ALL ON TABLE "public"."credit_packs" TO "authenticated";
GRANT ALL ON TABLE "public"."credit_packs" TO "service_role";



GRANT ALL ON TABLE "public"."daily_messages" TO "anon";
GRANT ALL ON TABLE "public"."daily_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_messages" TO "service_role";



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



GRANT ALL ON TABLE "public"."plant_growth_checkins" TO "anon";
GRANT ALL ON TABLE "public"."plant_growth_checkins" TO "authenticated";
GRANT ALL ON TABLE "public"."plant_growth_checkins" TO "service_role";



GRANT ALL ON TABLE "public"."plant_species_info" TO "anon";
GRANT ALL ON TABLE "public"."plant_species_info" TO "authenticated";
GRANT ALL ON TABLE "public"."plant_species_info" TO "service_role";



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



GRANT ALL ON TABLE "public"."push_tokens" TO "anon";
GRANT ALL ON TABLE "public"."push_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."push_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."revenuecat_processed_events" TO "anon";
GRANT ALL ON TABLE "public"."revenuecat_processed_events" TO "authenticated";
GRANT ALL ON TABLE "public"."revenuecat_processed_events" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";









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



