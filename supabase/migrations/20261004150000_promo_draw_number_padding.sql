CREATE OR REPLACE FUNCTION public.draw_promo_winner(p_campaign_id uuid, p_winning_number integer, p_notify_others boolean DEFAULT true)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_campaign public.promo_campaigns;
  v_winner_id uuid;
  v_number text := lpad(p_winning_number::text, greatest(4, length(p_winning_number::text)), '0');
begin
  select * into v_campaign from public.promo_campaigns where id = p_campaign_id for update;
  if not found then
    raise exception 'campaign_not_found';
  end if;
  if v_campaign.drawn_at is not null then
    raise exception 'already_drawn';
  end if;

  select user_id into v_winner_id
  from public.promo_redemptions
  where campaign_id = p_campaign_id and lucky_number = p_winning_number;
  if v_winner_id is null then
    raise exception 'number_not_found';
  end if;

  update public.promo_campaigns
  set drawn_at = now(), winning_number = p_winning_number
  where id = p_campaign_id;

  insert into public.notifications (user_id, type, title, message)
  select
    r.user_id,
    case when r.user_id = v_winner_id then 'promo_winner' else 'promo_result' end,
    case
      when r.user_id = v_winner_id and coalesce(p.locale, 'pt') like 'en%' then 'You won the ' || v_campaign.name || ' draw!'
      when r.user_id = v_winner_id then 'Você ganhou o sorteio ' || v_campaign.name || '!'
      when coalesce(p.locale, 'pt') like 'en%' then 'The ' || v_campaign.name || ' draw results are out'
      else 'Saiu o resultado do sorteio ' || v_campaign.name
    end,
    case
      when r.user_id = v_winner_id and coalesce(p.locale, 'pt') like 'en%' then 'Your lucky number ' || v_number || ' was drawn. Tap to arrange your prize.'
      when r.user_id = v_winner_id then 'Seu número da sorte ' || v_number || ' foi sorteado. Toque para combinar a entrega.'
      when coalesce(p.locale, 'pt') like 'en%' then 'The winning number was ' || v_number || '. Thanks for joining!'
      else 'O número sorteado foi ' || v_number || '. Obrigado por participar!'
    end
  from public.promo_redemptions r
  left join public.profiles p on p.id = r.user_id
  where r.campaign_id = p_campaign_id
    and r.lucky_number is not null
    and (p_notify_others or r.user_id = v_winner_id);

  return v_winner_id;
end;
$$;
