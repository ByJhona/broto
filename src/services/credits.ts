import { i18n } from '@/i18n';
import { supabase } from './supabase';

export type CreditsState = {
  planId: string;
  planName: string;
  monthlyCredits: number | null;
  balance: number | null;
  creditRenewalPeriod: 'weekly' | 'monthly';
  maxActiveListings: number | null;
  maxEventsPerMonth: number | null;
  maxListingPhotos: number | null;
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
};

type CreditsRow = {
  plan_id: string;
  plan_name: string;
  monthly_credits: number | null;
  balance: number | null;
  credit_renewal_period: 'weekly' | 'monthly';
  max_active_listings: number | null;
  max_events_per_month: number | null;
  max_listing_photos: number | null;
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
    maxActiveListings: data.max_active_listings,
    maxEventsPerMonth: data.max_events_per_month,
    maxListingPhotos: data.max_listing_photos,
  };
}

export class InsufficientCreditsError extends Error {
  constructor() {
    super(i18n.t('credits:insufficientCreditsMessage'));
    this.name = 'InsufficientCreditsError';
  }
}

export type CreditSpendReason = 'identification' | 'diagnosis' | 'growth_check' | 'chat_question' | 'boost_content';

export const CREDIT_COSTS: Record<CreditSpendReason, number> = {
  identification: 2,
  diagnosis: 5,
  growth_check: 3,
  chat_question: 1,
  boost_content: 20,
};

export type PlanCatalogItem = {
  id: string;
  name: string;
  description: string;
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
      monthly_credits: number | null;
      revenuecat_entitlement_id: string | null;
    }[]
  ).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
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

  return (data as { id: string; name: string; credits: number }[]).map((row) => ({
    id: row.id,
    name: row.name,
    credits: row.credits,
  }));
}
