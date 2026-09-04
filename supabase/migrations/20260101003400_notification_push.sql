select vault.create_secret(
  replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  'notification_push_secret'
);

create function public.handle_notification_created_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

create trigger on_notification_created_push
  after insert on public.notifications
  for each row execute function public.handle_notification_created_push();
