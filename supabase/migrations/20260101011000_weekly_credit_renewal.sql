-- Migration para automatizar a renovação semanal de créditos dos usuários
-- 1. Adiciona coluna last_renewal_at para rastrear quando os créditos foram renovados
alter table public.subscriptions 
add column if not exists last_renewal_at timestamp with time zone default now();

-- 2. Cria a função que executa a renovação (lógica de Top-Up)
create or replace function public.renew_all_subscriptions() returns void
  language plpgsql security definer
  set search_path to 'public'
as $$
declare
  sub record;
  v_current_balance integer;
  v_topup_amount integer;
begin
  -- Seleciona todos os usuários que:
  -- 1. Tem um plano com renovação semanal
  -- 2. Passaram-se 7 dias (ou mais) desde a última renovação (ou desde o cadastro/inserção do default)
  for sub in 
    select s.id as subscription_id, s.user_id, p.monthly_credits
    from public.subscriptions s
    join public.plans p on p.id = s.plan_id
    where p.credit_renewal_period = 'weekly'
      and s.last_renewal_at <= now() - interval '7 days'
  loop
    -- Verifica o saldo atual do usuário
    select public.get_credit_balance(sub.user_id) into v_current_balance;
    
    -- Calcula quanto precisa para bater o teto da cota semanal (Top-Up)
    v_topup_amount := sub.monthly_credits - v_current_balance;
    
    -- Só insere crédito se ele estiver abaixo do limite semanal
    if v_topup_amount > 0 then
      insert into public.credit_ledger (user_id, amount, reason)
      values (sub.user_id, v_topup_amount, 'weekly_grant');
    end if;
    
    -- Atualiza a data de renovação independentemente de ter inserido saldo ou não
    -- (ex: ele pode ter 200 de saldo por ter comprado pacote avulso, não recebe saldo agora mas a data reseta)
    update public.subscriptions 
    set last_renewal_at = now() 
    where id = sub.subscription_id;
  end loop;
end;
$$;

-- 3. Agendar no pg_cron para rodar todos os dias às 3:00 da manhã (00:00 em Brasília)
select cron.schedule(
  'weekly_credit_renewal_job',
  '0 3 * * *',
  $$ select public.renew_all_subscriptions(); $$
);
