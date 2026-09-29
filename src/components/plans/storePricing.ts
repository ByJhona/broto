import { PACKAGE_TYPE, type PurchasesPackage } from 'react-native-purchases';
import { findStorePackage, type CreditPack, type getOfferings, type PlanCatalogItem } from '@/services';
import { formatCurrency } from '@/utils';

export type StoreOfferings = Awaited<ReturnType<typeof getOfferings>>;

const BILLING_LABEL_KEYS: Partial<Record<PACKAGE_TYPE, string>> = {
  [PACKAGE_TYPE.WEEKLY]: 'billingWeekly',
  [PACKAGE_TYPE.MONTHLY]: 'billingMonthly',
  [PACKAGE_TYPE.ANNUAL]: 'billingAnnual',
};

const PRICE_PERIOD_KEYS: Partial<Record<PACKAGE_TYPE, string>> = {
  [PACKAGE_TYPE.WEEKLY]: 'priceWeekly',
  [PACKAGE_TYPE.ANNUAL]: 'priceYearly',
};

export function billingLabelKey(pkg: PurchasesPackage | undefined): string | null {
  return pkg ? (BILLING_LABEL_KEYS[pkg.packageType] ?? null) : null;
}

export function pricePeriodKey(pkg: PurchasesPackage): string {
  return PRICE_PERIOD_KEYS[pkg.packageType] ?? 'priceMonthly';
}

export function annualSavingsPercent(packages: (PurchasesPackage | undefined)[]): number | null {
  const monthly = packages.find((pkg) => pkg?.packageType === PACKAGE_TYPE.MONTHLY);
  const annual = packages.find((pkg) => pkg?.packageType === PACKAGE_TYPE.ANNUAL);
  if (!monthly || !annual || monthly.product.price <= 0) return null;
  const percent = Math.round((1 - annual.product.price / (monthly.product.price * 12)) * 100);
  return percent > 0 ? percent : null;
}

export function pricePerCredit(pkg: PurchasesPackage, credits: number): string {
  return formatCurrency(pkg.product.price / credits, pkg.product.currencyCode);
}

export function bestValuePackId(packs: CreditPack[], offerings: StoreOfferings): string | null {
  let bestId: string | null = null;
  let bestUnitPrice = Number.POSITIVE_INFINITY;
  for (const pack of packs) {
    const pkg = findStorePackage(offerings, pack.id);
    const unitPrice = pkg ? pkg.product.price / pack.credits : Number.POSITIVE_INFINITY;
    if (unitPrice < bestUnitPrice) {
      bestUnitPrice = unitPrice;
      bestId = pack.id;
    }
  }
  return bestId;
}

export function monthlyPlanId(plans: PlanCatalogItem[], offerings: StoreOfferings): string {
  const monthly = plans.find((plan) => findStorePackage(offerings, plan.id)?.packageType === PACKAGE_TYPE.MONTHLY);
  return (monthly ?? plans[0]).id;
}

export function cheapestPackId(packs: CreditPack[], offerings: StoreOfferings): string {
  const priced = packs.flatMap((pack) => {
    const pkg = findStorePackage(offerings, pack.id);
    return pkg ? [{ id: pack.id, price: pkg.product.price }] : [];
  });
  if (priced.length > 0) return priced.reduce((cheapest, pack) => (pack.price < cheapest.price ? pack : cheapest)).id;
  return packs.reduce((smallest, pack) => (pack.credits < smallest.credits ? pack : smallest)).id;
}
