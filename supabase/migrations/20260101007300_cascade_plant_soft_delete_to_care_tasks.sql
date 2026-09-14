create function public.cascade_plant_soft_delete() returns trigger
  language plpgsql
  set search_path to 'public'
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    update public.care_tasks
    set deleted_at = new.deleted_at
    where plant_id = new.id and deleted_at is null;
  end if;

  return new;
end;
$$;

create trigger on_plant_soft_delete
  after update on public.plants
  for each row execute function public.cascade_plant_soft_delete();
