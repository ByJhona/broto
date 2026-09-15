alter table public.plant_listing_proposals add column responded_at timestamptz;

create function public.set_proposal_responded_at() returns trigger
  language plpgsql
  set search_path to 'public'
as $$
begin
  if new.status <> 'pending' and old.status = 'pending' then
    new.responded_at = now();
  end if;
  return new;
end;
$$;

create trigger on_proposal_status_changed
  before update on public.plant_listing_proposals
  for each row execute function public.set_proposal_responded_at();
