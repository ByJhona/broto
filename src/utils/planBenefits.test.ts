import { i18n } from '@/i18n';
import type { PlanCatalogItem } from '@/services/credits';
import { planBenefits } from './planBenefits';

function plan(overrides: Partial<PlanCatalogItem> = {}): PlanCatalogItem {
  return {
    id: 'free',
    name: 'Free',
    description: '',
    monthlyCredits: 15,
    creditRenewalPeriod: 'weekly',
    maxListingPhotos: 3,
    revenuecatEntitlementId: null,
    ...overrides,
  };
}

describe('planBenefits', () => {
  it('describes limited plans with their counts', () => {
    expect(planBenefits(plan()).map((benefit) => benefit.text)).toEqual([
      i18n.t('credits:benefitCreditsWeekly', { count: 15 }),
      i18n.t('credits:benefitPhotos', { count: 3 }),
    ]);
  });

  it('describes missing limits as unlimited', () => {
    const benefits = planBenefits(plan({ monthlyCredits: null, maxListingPhotos: null }));

    expect(benefits.map((benefit) => benefit.text)).toEqual([
      i18n.t('credits:benefitCreditsUnlimited'),
      i18n.t('credits:benefitPhotosUnlimited'),
    ]);
  });

  it('uses the monthly wording for monthly renewals', () => {
    const [credits] = planBenefits(plan({ creditRenewalPeriod: 'monthly', monthlyCredits: 100 }));

    expect(credits.text).toBe(i18n.t('credits:benefitCreditsMonthly', { count: 100 }));
  });
});
