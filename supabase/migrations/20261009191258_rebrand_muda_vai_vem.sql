update public.plans set name = 'Muda+' where id = 'premium';
update public.plans set name = 'Muda+ Anual' where id = 'premium_annual';
update public.badge_batches set description = 'Emblemas por marcos de engajamento no Muda Vai Vem.' where id = 'conquistas';

create or replace function public.generate_promo_codes(p_campaign_id uuid, p_count integer, p_prefix text default 'MUDA')
returns setof text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code text;
  v_generated integer := 0;
begin
  while v_generated < p_count loop
    v_code := upper(p_prefix) || '-' || (
      select string_agg(substr(v_alphabet, 1 + get_byte(extensions.gen_random_bytes(1), 0) % length(v_alphabet), 1), '')
      from generate_series(1, 8)
    );

    insert into public.promo_codes (code, campaign_id, max_uses)
    values (v_code, p_campaign_id, 1)
    on conflict (code) do nothing;

    if found then
      v_generated := v_generated + 1;
      return next v_code;
    end if;
  end loop;
end;
$$;
