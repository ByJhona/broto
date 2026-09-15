alter table public.credit_ledger drop constraint credit_ledger_reason_check;
alter table public.credit_ledger add constraint credit_ledger_reason_check
  check (reason = any (array['monthly_grant', 'weekly_grant', 'identification', 'diagnosis', 'growth_check', 'chat_question', 'purchase', 'adjustment', 'boost_content']));
