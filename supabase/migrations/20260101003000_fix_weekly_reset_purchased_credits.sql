-- Uma edição direta no banco (fora das migrations) já tinha tentado resolver
-- o mesmo problema adicionando uma coluna `bucket` em credit_ledger, mas
-- ficou incompleta: consume_credit sempre grava saída como bucket 'plan'
-- (valor padrão da coluna), então gastar créditos nunca descontava do saldo
-- avulso, e get_plan_credit_balance não tinha piso em zero. Desfazemos essa
-- coluna e voltamos pra uma solução que deriva o saldo "do plano" a partir
-- da própria `reason` do lançamento — que já existia e já distinguia
-- concessão de plano (monthly_grant/weekly_grant) e consumo
-- (identification/diagnosis/growth_check) de compra avulsa (purchase).
create or replace function public.get_plan_credit_balance(target_user_id uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select greatest(0, coalesce(sum(amount), 0))::integer
  from public.credit_ledger
  where user_id = target_user_id
    and reason in ('monthly_grant', 'weekly_grant', 'identification', 'diagnosis', 'growth_check');
$$;

revoke all on function public.get_plan_credit_balance(uuid) from public, anon, authenticated;

alter table public.credit_ledger drop column if exists bucket;

-- get_credit_balance soma tudo (plano + avulso), então reset_credits_to_plan
-- usava esse total pra calcular quanto ajustar — se o total já estivesse
-- acima do teto do plano por causa de créditos avulsos comprados, o ajuste
-- ficava negativo e apagava créditos que a pessoa comprou de verdade. Agora
-- ele só completa o saldo "do plano" até o teto, nunca subtrai.
create or replace function public.reset_credits_to_plan(target_user_id uuid, target_balance integer, grant_reason text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_diff integer;
begin
  v_diff := greatest(0, target_balance - public.get_plan_credit_balance(target_user_id));

  if v_diff > 0 then
    insert into public.credit_ledger (user_id, amount, reason)
    values (target_user_id, v_diff, grant_reason);
  end if;

  return public.get_credit_balance(target_user_id);
end;
$$;

create or replace function public.grant_credits(target_user_id uuid, credit_amount integer, grant_reason text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if credit_amount <= 0 then
    raise exception 'credit_amount must be positive';
  end if;

  insert into public.credit_ledger (user_id, amount, reason)
  values (target_user_id, credit_amount, grant_reason);

  return public.get_credit_balance(target_user_id);
end;
$$;
