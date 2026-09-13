alter table public.plant_listings drop constraint plant_listings_status_check;
alter table public.plant_listings add constraint plant_listings_status_check
  check (status in ('available', 'completed', 'cancelled', 'expired'));

alter table public.events add column status text not null default 'active' check (status in ('active', 'cancelled'));

create function public.prevent_attendance_on_closed_event() returns trigger
  language plpgsql
  set search_path to 'public'
as $$
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

create trigger prevent_attendance_on_closed_event_trigger
  before insert on public.event_attendees
  for each row execute function public.prevent_attendance_on_closed_event();
