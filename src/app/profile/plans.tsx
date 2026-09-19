import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import Sprout from 'lucide-react-native/icons/sprout';
import Leaf from 'lucide-react-native/icons/leaf';
import Trees from 'lucide-react-native/icons/trees';
import Flower2 from 'lucide-react-native/icons/flower-2';
import Gem from 'lucide-react-native/icons/gem';
import type { LucideIcon } from 'lucide-react-native';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { useTranslation } from '@/i18n';
import { CreditPackCard, CreditPackCardSkeleton, PlanCard, PlanCardSkeleton, SectionTitle } from '@/components';
import { useCredits } from '@/hooks';
import {
  CATALOG_STALE_TIME,
  CREDIT_PACKS_QUERY_KEY,
  findStorePackage,
  getCreditPacks,
  getOfferings,
  getPlanCatalog,
  isPurchasesAvailable,
  isUserCancelledPurchase,
  PLAN_CATALOG_QUERY_KEY,
  purchasePackage,
  syncSubscription,
  type PlanCatalogItem,
} from '@/services';
import { Toast } from '@/utils';
import { PACKAGE_TYPE } from 'react-native-purchases';

const CREDIT_PACK_ICONS: Record<string, LucideIcon> = {
  credits_30: Sprout,
  credits_80: Leaf,
  credits_200: Trees,
  credits_500: Flower2,
};

function creditPackIcon(packId: string): LucideIcon {
  return CREDIT_PACK_ICONS[packId] ?? Gem;
}

const OFFERINGS_QUERY_KEY = ['offerings'] as const;

function isFreePlan(plan: PlanCatalogItem): boolean {
  return plan.revenuecatEntitlementId === null;
}

function getPlanCtaLabel(
  plan: PlanCatalogItem,
  purchasingId: string | null,
  t: (key: string) => string
): string | undefined {
  if (isFreePlan(plan)) return undefined;
  return purchasingId === plan.id ? t('processing') : t('subscribe');
}

function pricePeriodKey(packageType: PACKAGE_TYPE): string {
  if (packageType === PACKAGE_TYPE.ANNUAL) return 'priceYearly';
  if (packageType === PACKAGE_TYPE.WEEKLY) return 'priceWeekly';
  return 'priceMonthly';
}

function displaySubscriptionPrice(
  offerings: Awaited<ReturnType<typeof getOfferings>>,
  plan: PlanCatalogItem,
  t: (key: string, options?: { price: string }) => string
): string {
  if (isFreePlan(plan)) return t('free');

  const pkg = findStorePackage(offerings, plan.id);
  if (!pkg) return t('comingSoon');

  return t(pricePeriodKey(pkg.packageType), { price: pkg.product.priceString });
}

function displayPackPrice(
  offerings: Awaited<ReturnType<typeof getOfferings>>,
  packId: string,
  t: (key: string) => string
): string {
  return findStorePackage(offerings, packId)?.product.priceString ?? t('comingSoon');
}

export default function PlansScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation('credits');
  const { credits, refresh: refreshCredits } = useCredits();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  const plansQuery = useQuery({
    queryKey: PLAN_CATALOG_QUERY_KEY,
    queryFn: getPlanCatalog,
    staleTime: CATALOG_STALE_TIME,
  });

  const creditPacksQuery = useQuery({
    queryKey: CREDIT_PACKS_QUERY_KEY,
    queryFn: getCreditPacks,
    staleTime: CATALOG_STALE_TIME,
  });

  const offeringsQuery = useQuery({
    queryKey: OFFERINGS_QUERY_KEY,
    queryFn: getOfferings,
    staleTime: CATALOG_STALE_TIME,
  });

  const plans = plansQuery.data ?? [];
  const creditPacks = creditPacksQuery.data ?? [];
  const offerings = offeringsQuery.data ?? null;
  const isLoading = plansQuery.isLoading || creditPacksQuery.isLoading;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await syncSubscription();
    await Promise.all([plansQuery.refetch(), creditPacksQuery.refetch(), offeringsQuery.refetch(), refreshCredits()]);
    setIsRefreshing(false);
  };

  const handlePurchase = async (productId: string, successMessage: string) => {
    if (purchasingId) return;

    if (!(await isPurchasesAvailable())) {
      Toast.info(t('storeBeingPrepared'));
      return;
    }

    setPurchasingId(productId);
    try {
      const { data: freshOfferings } = await offeringsQuery.refetch();
      const pkg = findStorePackage(freshOfferings ?? null, productId);

      if (!pkg) {
        Toast.error(t('notYetAvailableInStores'));
        return;
      }

      await purchasePackage(pkg);
      await syncSubscription();
      await refreshCredits();
      Toast.success(successMessage);
    } catch (err) {
      if (!isUserCancelledPurchase(err)) {
        Toast.error(err instanceof Error ? err.message : t('purchaseError'));
      }
    } finally {
      setPurchasingId(null);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Metrics.spacing.lg }]}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.leaf} colors={[colors.leaf]} />
      }
    >
      {isLoading ? (
        <>
          <PlanCardSkeleton />
          <PlanCardSkeleton />
        </>
      ) : (
        plans.map((plan) => {
          const isCurrent = credits ? credits.planId === plan.id : plan.id === 'free';
          return (
            <PlanCard
              key={plan.id}
              plan={{
                id: plan.id,
                name: plan.name,
                description: plan.description,
                price: displaySubscriptionPrice(offerings, plan, t),
              }}
              isCurrent={isCurrent}
              ctaLabel={getPlanCtaLabel(plan, purchasingId, t)}
              onPressCta={isFreePlan(plan) ? undefined : () => handlePurchase(plan.id, t('subscriptionConfirmed'))}
            />
          );
        })
      )}

      {isLoading || creditPacks.length > 0 ? (
        <>
          <SectionTitle style={styles.sectionTitle}>{t('creditPacks')}</SectionTitle>
          {isLoading ? (
            <>
              <CreditPackCardSkeleton />
              <CreditPackCardSkeleton />
            </>
          ) : (
            creditPacks.map((pack) => (
              <CreditPackCard
                key={pack.id}
                icon={creditPackIcon(pack.id)}
                name={pack.name}
                credits={pack.credits}
                price={displayPackPrice(offerings, pack.id, t)}
                ctaLabel={purchasingId === pack.id ? t('processing') : t('buy')}
                onPressCta={() => handlePurchase(pack.id, t('creditsAddedToAccount'))}
              />
            ))
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    ...Metrics.layout.centeredContent,
    padding: Metrics.spacing.lg,
    gap: Metrics.spacing.md,
  },
  sectionTitle: {
    marginTop: Metrics.spacing.sm,
  },
  });
