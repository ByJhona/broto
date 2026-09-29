import { i18n } from '@/i18n';
import type { PlanCatalogItem } from '@/services/credits';

export const PLAN_BENEFIT = {
  CREDITS: 'credits',
  PHOTOS: 'photos',
} as const;

export type PlanBenefitKind = (typeof PLAN_BENEFIT)[keyof typeof PLAN_BENEFIT];

export type PlanBenefit = {
  kind: PlanBenefitKind;
  text: string;
};

function limitText(limit: number | null, unlimitedKey: string, limitedKey: string): string {
  return limit == null ? i18n.t(unlimitedKey) : i18n.t(limitedKey, { count: limit });
}

function creditsText(plan: PlanCatalogItem): string {
  if (plan.monthlyCredits == null) return i18n.t('credits:benefitCreditsUnlimited');
  const key = plan.creditRenewalPeriod === 'weekly' ? 'credits:benefitCreditsWeekly' : 'credits:benefitCreditsMonthly';
  return i18n.t(key, { count: plan.monthlyCredits });
}

export function planBenefits(plan: PlanCatalogItem): PlanBenefit[] {
  return [
    { kind: PLAN_BENEFIT.CREDITS, text: creditsText(plan) },
    {
      kind: PLAN_BENEFIT.PHOTOS,
      text: limitText(plan.maxListingPhotos, 'credits:benefitPhotosUnlimited', 'credits:benefitPhotos'),
    },
  ];
}
