ALTER TABLE public.promo_campaigns
  ADD COLUMN drawn_at timestamptz,
  ADD COLUMN winning_number integer,
  ADD COLUMN contact_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'system'::text, 'like'::text, 'comment'::text, 'listing_interest'::text, 'care_setup_reminder'::text,
    'care_reminder'::text, 'promo_winner'::text, 'promo_result'::text
  ]));

CREATE OR REPLACE FUNCTION public.get_my_lucky_numbers()
RETURNS TABLE (
  campaign_id uuid,
  campaign_name text,
  lucky_number integer,
  ends_at timestamptz,
  drawn_at timestamptz,
  is_winner boolean,
  contact_user_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select
    c.id,
    c.name,
    r.lucky_number,
    c.ends_at,
    c.drawn_at,
    c.drawn_at is not null and c.winning_number = r.lucky_number,
    c.contact_user_id
  from public.promo_redemptions r
  join public.promo_campaigns c on c.id = r.campaign_id
  where r.user_id = auth.uid() and r.lucky_number is not null
  order by r.redeemed_at desc;
$$;

REVOKE ALL ON FUNCTION public.get_my_lucky_numbers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_lucky_numbers() TO authenticated;

CREATE OR REPLACE FUNCTION public.draw_promo_winner(p_campaign_id uuid, p_winning_number integer, p_notify_others boolean DEFAULT true)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_campaign public.promo_campaigns;
  v_winner_id uuid;
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
      when r.user_id = v_winner_id and coalesce(p.locale, 'pt') like 'en%' then 'Your lucky number ' || lpad(p_winning_number::text, 4, '0') || ' was drawn. Tap to arrange your prize.'
      when r.user_id = v_winner_id then 'Seu número da sorte ' || lpad(p_winning_number::text, 4, '0') || ' foi sorteado. Toque para combinar a entrega.'
      when coalesce(p.locale, 'pt') like 'en%' then 'The winning number was ' || lpad(p_winning_number::text, 4, '0') || '. Thanks for joining!'
      else 'O número sorteado foi ' || lpad(p_winning_number::text, 4, '0') || '. Obrigado por participar!'
    end
  from public.promo_redemptions r
  left join public.profiles p on p.id = r.user_id
  where r.campaign_id = p_campaign_id
    and r.lucky_number is not null
    and (p_notify_others or r.user_id = v_winner_id);

  return v_winner_id;
end;
$$;

REVOKE ALL ON FUNCTION public.draw_promo_winner(uuid, integer, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.draw_promo_winner(uuid, integer, boolean) TO service_role;
