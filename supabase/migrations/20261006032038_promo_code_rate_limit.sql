CREATE TABLE public.promo_redeem_failures (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX promo_redeem_failures_user_created_idx ON public.promo_redeem_failures (user_id, created_at DESC);

ALTER TABLE public.promo_redeem_failures ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.promo_redeem_failures FROM anon, authenticated;

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

  if (
    select count(*) from public.promo_redeem_failures
    where user_id = v_user_id and created_at > now() - interval '1 hour'
  ) >= 10 then
    return jsonb_build_object('error', 'too_many_attempts');
  end if;

  begin
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
  exception when raise_exception then
    insert into public.promo_redeem_failures (user_id) values (v_user_id);
    return jsonb_build_object('error', SQLERRM);
  end;

  return jsonb_build_object(
    'campaignName', v_campaign.name,
    'credits', v_campaign.credits,
    'luckyNumber', v_lucky_number,
    'creditBalance', public.get_credit_balance(v_user_id)
  );
end;
$$;

CREATE OR REPLACE FUNCTION public.generate_promo_codes(p_campaign_id uuid, p_count integer, p_prefix text DEFAULT 'BROTO')
RETURNS SETOF text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
