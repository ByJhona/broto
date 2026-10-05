CREATE TABLE public.promo_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  credits integer NOT NULL DEFAULT 0 CHECK (credits >= 0),
  has_raffle boolean NOT NULL DEFAULT false,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  max_redemptions integer CHECK (max_redemptions > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.promo_codes (
  code text PRIMARY KEY CHECK (code = upper(code)),
  campaign_id uuid NOT NULL REFERENCES public.promo_campaigns (id) ON DELETE CASCADE,
  max_uses integer CHECK (max_uses > 0),
  uses integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX promo_codes_campaign_id_idx ON public.promo_codes (campaign_id);

CREATE TABLE public.promo_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.promo_campaigns (id) ON DELETE CASCADE,
  code text NOT NULL REFERENCES public.promo_codes (code) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  credits integer NOT NULL DEFAULT 0,
  lucky_number integer,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, user_id),
  UNIQUE (campaign_id, lucky_number)
);

CREATE INDEX promo_redemptions_user_id_idx ON public.promo_redemptions (user_id);
CREATE INDEX promo_redemptions_code_idx ON public.promo_redemptions (code);

ALTER TABLE public.promo_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own promo redemptions"
  ON public.promo_redemptions FOR SELECT
  USING ((select auth.uid()) = user_id);

ALTER TABLE public.credit_ledger DROP CONSTRAINT credit_ledger_reason_check;

ALTER TABLE public.credit_ledger
  ADD CONSTRAINT credit_ledger_reason_check
  CHECK (reason = ANY (ARRAY[
    'signup_bonus'::text, 'plan_upgrade'::text, 'manual_adjustment'::text, 'identification'::text, 'diagnosis'::text,
    'growth_check'::text, 'chat_question'::text, 'boost_content'::text, 'weekly_renewal'::text, 'weekly_grant'::text,
    'monthly_grant'::text, 'purchase'::text, 'promo_code'::text
  ]));

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
  v_lucky_number integer;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_code from public.promo_codes where code = upper(trim(p_code)) for update;
  if not found then
    raise exception 'invalid_code';
  end if;

  select * into v_campaign from public.promo_campaigns where id = v_code.campaign_id for update;

  if now() < v_campaign.starts_at or (v_campaign.ends_at is not null and now() > v_campaign.ends_at) then
    raise exception 'expired_code';
  end if;

  if exists (select 1 from public.promo_redemptions where campaign_id = v_campaign.id and user_id = v_user_id) then
    raise exception 'already_redeemed';
  end if;

  if (v_code.max_uses is not null and v_code.uses >= v_code.max_uses)
    or (v_campaign.max_redemptions is not null
      and (select count(*) from public.promo_redemptions where campaign_id = v_campaign.id) >= v_campaign.max_redemptions) then
    raise exception 'code_exhausted';
  end if;

  if v_campaign.has_raffle then
    select coalesce(max(lucky_number), 0) + 1 into v_lucky_number
    from public.promo_redemptions
    where campaign_id = v_campaign.id;
  end if;

  insert into public.promo_redemptions (campaign_id, code, user_id, credits, lucky_number)
  values (v_campaign.id, v_code.code, v_user_id, v_campaign.credits, v_lucky_number);

  update public.promo_codes set uses = uses + 1 where code = v_code.code;

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

REVOKE ALL ON FUNCTION public.redeem_promo_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_promo_code(text) TO authenticated;

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
      select string_agg(substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1), '')
      from generate_series(1, 6)
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

REVOKE ALL ON FUNCTION public.generate_promo_codes(uuid, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_promo_codes(uuid, integer, text) TO service_role;
