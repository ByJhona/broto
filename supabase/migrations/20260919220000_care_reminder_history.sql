ALTER TABLE public.notifications
  DROP CONSTRAINT notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY['system'::text, 'like'::text, 'comment'::text, 'listing_interest'::text, 'listing_message'::text, 'care_setup_reminder'::text, 'care_reminder'::text]));

CREATE OR REPLACE FUNCTION public.handle_notification_created_push() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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
