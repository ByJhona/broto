import { supabase } from './supabase';

export type CreditsState = {
  planId: string;
  planName: string;
  monthlyCredits: number | null;
  balance: number | null;
  creditRenewalPeriod: 'weekly' | 'monthly';
};

export function canAfford(credits: CreditsState | null, cost: number): boolean {
  if (!credits) return false;
  if (credits.monthlyCredits == null) return true;
  return credits.balance != null && credits.balance >= cost;
}

export type CreditPack = {
  id: string;
  name: string;
  credits: number;
  priceCents: number;
};

type CreditsRow = {
  plan_id: string;
  plan_name: string;
  monthly_credits: number | null;
  balance: number | null;
  credit_renewal_period: 'weekly' | 'monthly';
};

export async function getCredits(): Promise<CreditsState | null> {
  const { data, error } = await supabase.rpc('get_my_credits').maybeSingle<CreditsRow>();

  if (error || !data) {
    console.warn('Não foi possível buscar os créditos:', error);
    return null;
  }

  return {
    planId: data.plan_id,
    planName: data.plan_name,
    monthlyCredits: data.monthly_credits,
    balance: data.balance,
    creditRenewalPeriod: data.credit_renewal_period,
  };
}

export class InsufficientCreditsError extends Error {
  constructor() {
    super('Você usou todos os seus créditos do mês.');
    this.name = 'InsufficientCreditsError';
  }
}

export type CreditSpendReason = 'identification' | 'diagnosis' | 'growth_check' | 'chat_question';

export const CREDIT_COSTS: Record<CreditSpendReason, number> = {
  identification: 2,
  diagnosis: 4,
  growth_check: 2,
  chat_question: 1,
};

export type PlanCatalogItem = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  monthlyCredits: number | null;
  revenuecatEntitlementId: string | null;
};

export const CATALOG_STALE_TIME = 10 * 60_000;
export const PLAN_CATALOG_QUERY_KEY = ['plan-catalog'] as const;
export const CREDIT_PACKS_QUERY_KEY = ['credit-packs'] as const;

export async function getPlanCatalog(): Promise<PlanCatalogItem[]> {
  const { data, error } = await supabase.from('plans').select('*').order('sort_order');

  if (error) {
    console.warn('Não foi possível buscar os planos:', error);
    return [];
  }

  return (
    data as {
      id: string;
      name: string;
      description: string;
      price_cents: number;
      monthly_credits: number | null;
      revenuecat_entitlement_id: string | null;
    }[]
  ).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    monthlyCredits: row.monthly_credits,
    revenuecatEntitlementId: row.revenuecat_entitlement_id,
  }));
}

export async function getCreditPacks(): Promise<CreditPack[]> {
  const { data, error } = await supabase.from('credit_packs').select('*').order('sort_order');

  if (error) {
    console.warn('Não foi possível buscar os pacotes de créditos:', error);
    return [];
  }

  return (data as { id: string; name: string; credits: number; price_cents: number }[]).map((row) => ({
    id: row.id,
    name: row.name,
    credits: row.credits,
    priceCents: row.price_cents,
  }));
}
