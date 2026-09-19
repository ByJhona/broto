CREATE OR REPLACE FUNCTION public.handle_new_listing_proposal() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.notifications (user_id, actor_id, type, listing_id)
  values (new.recipient_id, new.sender_id, 'listing_interest', new.listing_id);

  return new;
end;
$$;

ALTER TABLE public.notifications
  DROP CONSTRAINT notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY['system'::text, 'like'::text, 'comment'::text, 'listing_interest'::text, 'listing_message'::text, 'care_setup_reminder'::text]));

ALTER TABLE public.notifications
  ADD COLUMN plant_id uuid REFERENCES public.plants(id) ON DELETE CASCADE;

ALTER TABLE public.plants
  ADD COLUMN care_setup_reminder_sent_at timestamptz;

CREATE OR REPLACE FUNCTION public.send_care_setup_reminders() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'care_setup_reminders_job') THEN
    PERFORM cron.schedule('care_setup_reminders_job', '0 15 * * *', 'select public.send_care_setup_reminders();');
  END IF;
END $$;
