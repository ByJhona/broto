DROP TRIGGER IF EXISTS on_listing_message_created ON public.chat_messages;

DROP FUNCTION IF EXISTS public.handle_new_listing_message();

DELETE FROM public.notifications
WHERE type = 'listing_message';

ALTER TABLE public.notifications
  DROP CONSTRAINT notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY['system'::text, 'like'::text, 'comment'::text, 'listing_interest'::text, 'care_setup_reminder'::text, 'care_reminder'::text]));

CREATE OR REPLACE FUNCTION public.handle_chat_message_created_push() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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

CREATE TRIGGER on_chat_message_created_push
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_chat_message_created_push();
