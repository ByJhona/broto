create or replace function public.handle_new_like()
returns trigger as $$
declare
  post_owner uuid;
  liker_name text;
begin
  select user_id into post_owner from public.posts where id = new.post_id;

  if post_owner != new.user_id then
    select name into liker_name from public.profiles where id = new.user_id;

    if liker_name is null or liker_name = '' then
      select username into liker_name from public.profiles where id = new.user_id;
    end if;

    if liker_name is null or liker_name = '' then
      liker_name := 'Alguém';
    end if;

    insert into public.notifications (user_id, title, message, type, post_id)
    values (
      post_owner,
      'Nova curtida',
      liker_name || ' acabou de curtir a sua foto!',
      'like',
      new.post_id
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create or replace function public.handle_new_comment()
returns trigger as $$
declare
  post_owner uuid;
  commenter_name text;
begin
  select user_id into post_owner from public.posts where id = new.post_id;

  if post_owner != new.user_id then
    select name into commenter_name from public.profiles where id = new.user_id;

    if commenter_name is null or commenter_name = '' then
      select username into commenter_name from public.profiles where id = new.user_id;
    end if;

    if commenter_name is null or commenter_name = '' then
      commenter_name := 'Alguém';
    end if;

    insert into public.notifications (user_id, title, message, type, post_id)
    values (
      post_owner,
      'Novo recado',
      commenter_name || ' deixou um recado na sua foto!',
      'comment',
      new.post_id
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;
