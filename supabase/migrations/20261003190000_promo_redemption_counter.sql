ALTER TABLE public.promo_campaigns ADD COLUMN redemption_count integer NOT NULL DEFAULT 0;

UPDATE public.promo_campaigns c
SET redemption_count = (select count(*) from public.promo_redemptions r where r.campaign_id = c.id);

CREATE OR REPLACE FUNCTION public.redeem_promo_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_user_id uuid := auth.uid();
  v_code public.promo_codes;
  v_campaign public.promo_campaigns;
  v_position integer;
  v_lucky_number integer;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_code from public.promo_codes where code = upper(trim(p_code));
  if not found then
    raise exception 'invalid_code';
  end if;

  select * into v_campaign from public.promo_campaigns where id = v_code.campaign_id;

  if now() < v_campaign.starts_at or (v_campaign.ends_at is not null and now() > v_campaign.ends_at) then
    raise exception 'expired_code';
  end if;

  if exists (select 1 from public.promo_redemptions where campaign_id = v_campaign.id and user_id = v_user_id) then
    raise exception 'already_redeemed';
  end if;

  if v_code.max_uses is not null then
    update public.promo_codes set uses = uses + 1 where code = v_code.code and uses < max_uses;
    if not found then
      raise exception 'code_exhausted';
    end if;
  end if;

  update public.promo_campaigns
  set redemption_count = redemption_count + 1
  where id = v_campaign.id and (max_redemptions is null or redemption_count < max_redemptions)
  returning redemption_count into v_position;
  if v_position is null then
    raise exception 'code_exhausted';
  end if;

  if v_campaign.has_raffle then
    v_lucky_number := v_position;
  end if;

  begin
    insert into public.promo_redemptions (campaign_id, code, user_id, credits, lucky_number)
    values (v_campaign.id, v_code.code, v_user_id, v_campaign.credits, v_lucky_number);
  exception when unique_violation then
    raise exception 'already_redeemed';
  end;

  if v_campaign.credits > 0 then
    insert into public.credit_ledger (user_id, amount, reason)
    values (v_user_id, v_campaign.credits, 'promo_code');
  end if;

  return jsonb_build_object(
    'campaignName', v_campaign.name,
    'credits', v_campaign.credits,
    'luckyNumber', v_lucky_number,
    'creditBalance', public.get_credit_balance(v_user_id)
  );
end;
$$;
