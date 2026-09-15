alter table public.badges add column scientific_name text;

update public.badges set scientific_name = 'Monstera deliciosa' where id = 'monstera-deliciosa';
update public.badges set scientific_name = 'Epipremnum aureum' where id = 'epipremnum-aureum';
update public.badges set scientific_name = 'Dracaena trifasciata' where id = 'dracaena-trifasciata';
update public.badges set scientific_name = 'Syngonium podophyllum' where id = 'syngonium-podophyllum';
update public.badges set scientific_name = 'Dieffenbachia seguine' where id = 'dieffenbachia-seguine';
update public.badges set scientific_name = 'Chrysalidocarpus lutescens' where id = 'chrysalidocarpus-lutescens';
update public.badges set scientific_name = 'Chamaedorea elegans' where id = 'chamaedorea-elegans';
update public.badges set scientific_name = 'Rhaphidophora tetrasperma' where id = 'rhaphidophora-tetrasperma';
update public.badges set scientific_name = 'Scindapsus aureus' where id = 'scindapsus-aureus';
update public.badges set scientific_name = 'Oxalis triangularis' where id = 'oxalis-triangularis';
update public.badges set scientific_name = 'Haworthia attenuata' where id = 'haworthia-attenuata';
update public.badges set scientific_name = 'Beaucarnea recurvata' where id = 'beaucarnea-recurvata';
update public.badges set scientific_name = 'Agave americana' where id = 'agave-americana';
update public.badges set scientific_name = 'Portulacaria afra' where id = 'portulacaria-afra';
update public.badges set scientific_name = 'Adenium obesum' where id = 'adenium-obesum';
update public.badges set scientific_name = 'Hibiscus rosa-sinensis' where id = 'hibiscus-rosa-sinensis';
update public.badges set scientific_name = 'Guzmania lingulata' where id = 'guzmania-lingulata';
update public.badges set scientific_name = 'Gymnocalycium mihanovichii' where id = 'gymnocalycium-mihanovichii';
update public.badges set scientific_name = 'Mammillaria elongata' where id = 'mammillaria-elongata';
update public.badges set scientific_name = 'Dionaea muscipula' where id = 'dionaea-muscipula';

create function public.grant_species_badge() returns trigger
  language plpgsql security definer set search_path to 'public'
as $$
declare
  matched_badge_id text;
begin
  select id into matched_badge_id
  from public.badges
  where scientific_name = new.species
  limit 1;

  if matched_badge_id is not null then
    perform public.grant_badge(new.user_id, matched_badge_id, 'garden_add');
  end if;

  return new;
end;
$$;

create trigger grant_species_badge_on_plant_insert
  after insert on public.plants
  for each row
  execute function public.grant_species_badge();
