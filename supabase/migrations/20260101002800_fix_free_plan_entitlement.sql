-- O plano free ficou com o mesmo revenuecat_entitlement_id do premium (edição
-- manual anterior), o que fazia o webhook do RevenueCat encontrar duas linhas
-- pra um único entitlement e desistir de atualizar a assinatura do usuário.
-- Só plano pago deve mapear pra um entitlement.
update public.plans
set revenuecat_entitlement_id = null
where id = 'free';
