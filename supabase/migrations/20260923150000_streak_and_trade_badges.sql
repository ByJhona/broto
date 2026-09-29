INSERT INTO "public"."badge_batches" ("id", "name", "description", "sort_order", "is_active") VALUES
	('conquistas', 'Conquistas', 'Emblemas por marcos de engajamento no broto.', 1, true);

INSERT INTO "public"."badges" ("id", "batch_id", "name", "description", "pixel_art", "sort_order", "is_active", "scientific_name") VALUES
	('streak-7-dias', 'conquistas', 'Chama acesa', 'Você cuidou das suas plantas por 7 dias seguidos.', '{"size": 16, "palette": [null, "#F97316"], "pixels": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0]}', 0, true, NULL),
	('streak-30-dias', 'conquistas', 'Fogo constante', 'Você cuidou das suas plantas por 30 dias seguidos.', '{"size": 16, "palette": [null, "#EA580C", "#FDE047"], "pixels": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,2,2,1,0,0,0,0,0,0,0,0,0,0,0,1,2,2,2,1,1,0,0,0,0,0,0,0,0,0,1,1,2,2,2,2,1,1,0,0,0,0,0,0,0,0,1,1,2,2,2,2,1,1,0,0,0,0,0,0,0,0,1,1,2,2,2,2,1,1,1,0,0,0,0,0,0,0,1,1,2,2,2,2,1,1,1,1,0,0,0,0,0,0,1,1,2,2,2,2,2,1,1,1,0,0,0,0,0,1,1,1,2,2,2,2,2,1,1,1,0,0,0,0,0,1,1,1,2,2,2,2,2,1,1,1,0,0,0,0,1,1,1,2,2,2,2,2,2,1,1,1,0,0,0,0,1,1,1,2,2,2,2,2,2,1,1,1,0,0,0,0,0,1,1,1,2,2,2,2,1,1,1,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0]}', 1, true, NULL),
	('primeira-troca', 'conquistas', 'Primeira troca', 'Você concluiu sua primeira troca ou doação de planta.', '{"size": 16, "palette": [null, "#16A34A"], "pixels": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}', 2, true, NULL);

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

ALTER FUNCTION "public"."current_care_streak"("target_user_id" "uuid", "as_of" "date") OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."current_care_streak"("target_user_id" "uuid", "as_of" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."current_care_streak"("target_user_id" "uuid", "as_of" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_care_streak"("target_user_id" "uuid", "as_of" "date") TO "service_role";

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

ALTER FUNCTION "public"."grant_streak_badges"() OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."grant_streak_badges"() TO "anon";
GRANT ALL ON FUNCTION "public"."grant_streak_badges"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."grant_streak_badges"() TO "service_role";

CREATE OR REPLACE TRIGGER "grant_streak_badges_on_completion" AFTER INSERT ON "public"."care_task_completions" FOR EACH ROW EXECUTE FUNCTION "public"."grant_streak_badges"();

CREATE OR REPLACE FUNCTION "public"."grant_trade_badge"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    perform public.grant_badge(new.user_id, 'primeira-troca', 'listing_completed');
  end if;

  return new;
end;
$$;

ALTER FUNCTION "public"."grant_trade_badge"() OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."grant_trade_badge"() TO "anon";
GRANT ALL ON FUNCTION "public"."grant_trade_badge"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."grant_trade_badge"() TO "service_role";

CREATE OR REPLACE TRIGGER "grant_trade_badge_on_listing_completed" AFTER UPDATE ON "public"."plant_listings" FOR EACH ROW EXECUTE FUNCTION "public"."grant_trade_badge"();
