ALTER TABLE public.user_badges ADD COLUMN celebrated_at timestamptz;

UPDATE public.user_badges SET celebrated_at = granted_at;

INSERT INTO public.badges (id, batch_id, name, description, pixel_art, sort_order, is_active, scientific_name) VALUES
  ('primeira-doacao', 'conquistas', 'Primeira doação', 'Você participou da sua primeira doação de planta.', '{"size":32,"palette":[null,"#26301F","#7CC47E","#4E9A5F","#3D6B2F","#2F6B3F","#E04A52","#D4AF37","#8E1F28","#C8323A"],"pixels":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,2,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,1,2,2,2,2,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,3,3,3,1,4,2,2,2,3,3,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,3,3,3,3,5,4,1,2,3,3,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,3,3,5,5,1,4,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,4,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,4,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,4,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,4,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,6,6,6,6,6,6,6,6,6,7,4,6,6,6,6,6,6,6,6,6,1,0,0,0,0,0,0,0,0,0,0,1,6,6,6,6,6,6,6,6,6,7,7,6,6,6,6,6,6,6,6,6,1,0,0,0,0,0,0,0,0,0,0,1,8,8,8,8,8,8,8,8,8,7,7,8,8,8,8,8,8,8,8,8,1,0,0,0,0,0,0,0,0,0,0,0,1,9,9,9,9,9,9,9,9,7,7,9,9,9,9,9,8,8,8,1,0,0,0,0,0,0,0,0,0,0,0,0,1,9,9,9,9,9,9,9,9,7,7,9,9,9,9,9,8,8,8,1,0,0,0,0,0,0,0,0,0,0,0,0,1,9,9,9,9,9,9,9,9,7,7,9,9,9,9,9,8,8,8,1,0,0,0,0,0,0,0,0,0,0,0,0,1,9,9,9,9,9,9,9,9,7,7,9,9,9,9,9,8,8,8,1,0,0,0,0,0,0,0,0,0,0,0,0,1,9,9,9,9,9,9,9,9,7,7,9,9,9,9,9,8,8,8,1,0,0,0,0,0,0,0,0,0,0,0,0,1,9,9,9,9,9,9,9,9,7,7,9,9,9,9,9,8,8,8,1,0,0,0,0,0,0,0,0,0,0,0,0,1,9,9,9,9,9,9,9,9,7,7,9,9,9,9,9,8,8,8,1,0,0,0,0,0,0,0,0,0,0,0,0,1,9,9,9,9,9,9,9,9,7,7,9,9,9,9,9,8,8,8,1,0,0,0,0,0,0,0,0,0,0,0,0,1,9,9,9,9,9,9,9,9,7,7,9,9,9,9,9,8,8,8,1,0,0,0,0,0,0,0,0,0,0,0,0,1,9,9,9,9,9,9,9,9,7,7,9,9,9,9,9,8,8,8,1,0,0,0,0,0,0,0,0,0,0,0,0,1,9,9,9,9,9,9,9,9,7,7,9,9,9,9,9,8,8,8,1,0,0,0,0,0,0,0,0,0,0,0,0,1,9,9,9,9,9,9,9,9,7,7,9,9,9,9,9,8,8,8,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}'::jsonb, 3, true, NULL),
  ('primeira-venda', 'conquistas', 'Primeiro negócio', 'Você fechou sua primeira compra ou venda de planta.', '{"size":32,"palette":[null,"#26301F","#F6D77A","#E3B341","#B8892B","#7CC47E","#4E9A5F","#3D6B2F","#2F6B3F","#35241A","#4A3222","#DE8B65","#A4553A","#C8704C"],"pixels":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,2,2,2,3,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,2,2,2,3,3,3,3,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,2,2,2,3,4,3,3,3,3,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,2,2,4,4,4,4,3,3,3,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,2,3,4,3,4,3,3,3,4,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,2,3,3,3,4,4,3,3,4,4,4,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,3,3,3,3,3,4,4,4,4,4,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,3,3,3,4,4,4,4,4,4,4,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,5,3,3,3,3,3,4,4,4,4,4,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,1,5,5,5,3,3,3,4,4,4,4,4,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,5,6,6,6,1,7,5,5,5,6,6,4,4,4,4,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,5,6,6,6,6,8,7,1,5,6,6,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,6,6,8,8,1,7,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,7,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,7,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,7,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,7,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,7,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,7,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,9,10,10,9,10,10,9,7,10,9,10,10,9,10,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,12,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,12,12,13,13,13,13,13,13,13,13,13,13,13,13,12,12,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,13,11,13,13,13,13,13,13,13,13,13,13,12,12,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,13,11,13,13,13,13,13,13,13,13,13,13,12,12,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,13,11,13,13,13,13,13,13,13,13,13,13,12,12,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,13,11,13,13,13,13,13,13,13,13,12,12,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,13,11,13,13,13,13,13,13,13,13,12,12,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,13,11,13,13,13,13,13,13,13,13,12,12,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,13,11,13,13,13,13,13,13,12,12,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0]}'::jsonb, 4, true, NULL)
ON CONFLICT (id) DO NOTHING;

UPDATE public.badges SET description = 'Você concluiu sua primeira troca de planta.' WHERE id = 'primeira-troca';

CREATE OR REPLACE FUNCTION public.listing_badge_id(p_listing_type text) RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  select case p_listing_type
    when 'exchange' then 'primeira-troca'
    when 'sale' then 'primeira-venda'
    else 'primeira-doacao'
  end;
$$;

CREATE OR REPLACE FUNCTION public.grant_trade_badge() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    perform public.grant_badge(new.user_id, public.listing_badge_id(new.listing_type), 'listing_completed');
  end if;

  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.grant_badge_on_proposal_accepted() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_badge_id text;
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    select public.listing_badge_id(listing_type) into v_badge_id
    from public.plant_listings
    where id = new.listing_id;

    if v_badge_id is not null then
      perform public.grant_badge(new.sender_id, v_badge_id, 'proposal_accepted');
      perform public.grant_badge(new.recipient_id, v_badge_id, 'proposal_accepted');
    end if;
  end if;

  return new;
end;
$$;

REVOKE ALL ON FUNCTION public.grant_badge_on_proposal_accepted() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE TRIGGER grant_badge_after_proposal_accepted
  AFTER UPDATE OF status ON public.plant_listing_proposals
  FOR EACH ROW EXECUTE FUNCTION public.grant_badge_on_proposal_accepted();

CREATE OR REPLACE FUNCTION public.mark_badges_celebrated(p_badge_ids text[]) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  update public.user_badges
  set celebrated_at = now()
  where user_id = auth.uid() and badge_id = any(p_badge_ids) and celebrated_at is null;
$$;

REVOKE ALL ON FUNCTION public.mark_badges_celebrated(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_badges_celebrated(text[]) TO authenticated;
