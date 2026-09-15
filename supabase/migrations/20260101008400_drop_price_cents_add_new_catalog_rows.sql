alter table public.plans drop column price_cents;
alter table public.credit_packs drop column price_cents;

insert into public.plans (
  id, name, description, monthly_credits, revenuecat_entitlement_id,
  sort_order, credit_renewal_period, max_active_listings, max_events_per_month, max_listing_photos
) values (
  'premium_annual',
  'Broto+ Anual',
  '40 créditos por semana para identificar, diagnosticar e cuidar das suas plantas · anúncios e eventos ilimitados · preço travado por 12 meses',
  40,
  'broto_prod',
  3,
  'weekly',
  null,
  null,
  8
);

delete from public.credit_packs where id in ('credits_10', 'credits_25', 'credits_60');

insert into public.credit_packs (id, name, credits, sort_order) values
  ('credits_30', 'Pacote Broto', 30, 1),
  ('credits_80', 'Pacote Verde', 80, 2),
  ('credits_200', 'Pacote Floresta', 200, 3),
  ('credits_500', 'Pacote Jardim', 500, 4);
