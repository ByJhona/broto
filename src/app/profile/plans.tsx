import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { FloatingScreenControls, InfoSection, PageTitle, SkeletonBlock, TextButton, useScreenTopInset } from '@/components';
import { CreditPackPicker } from '@/components/plans/CreditPackPicker';
import { FreePlanRow } from '@/components/plans/FreePlanRow';
import { PlanSummary } from '@/components/plans/PlanSummary';
import { PremiumPlanCard } from '@/components/plans/PremiumPlanCard';
import { useCredits, useManageSubscription } from '@/hooks';
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
  restorePurchases,
  syncSubscription,
  type PlanCatalogItem,
} from '@/services';
import { Toast } from '@/utils';

const OFFERINGS_QUERY_KEY = ['offerings'] as const;

function isFreePlan(plan: PlanCatalogItem): boolean {
  return plan.revenuecatEntitlementId === null;
}

function PlansSkeleton() {
  return (
    <>
      <SkeletonBlock height={Metrics.media.md} radius={Metrics.radius.lg} />
      <SkeletonBlock height={Metrics.size.xxl} radius={Metrics.radius.lg} />
    </>
  );
}

export default function PlansScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = useScreenTopInset();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation(['credits', 'profile']);
  const { credits, refresh: refreshCredits } = useCredits();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const plansQuery = useQuery({ queryKey: PLAN_CATALOG_QUERY_KEY, queryFn: getPlanCatalog, staleTime: CATALOG_STALE_TIME });
  const creditPacksQuery = useQuery({ queryKey: CREDIT_PACKS_QUERY_KEY, queryFn: getCreditPacks, staleTime: CATALOG_STALE_TIME });
  const offeringsQuery = useQuery({ queryKey: OFFERINGS_QUERY_KEY, queryFn: getOfferings, staleTime: CATALOG_STALE_TIME });

  const plans = plansQuery.data ?? [];
  const paidPlans = plans.filter((plan) => !isFreePlan(plan));
  const freePlan = plans.find(isFreePlan);
  const creditPacks = creditPacksQuery.data ?? [];
  const offerings = offeringsQuery.data ?? null;
  const currentPlanId = credits?.planId ?? null;

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
        console.error(err);
        Toast.error(t('purchaseError'));
      }
    } finally {
      setPurchasingId(null);
    }
  };

  const handleRestore = async () => {
    if (isRestoring) return;

    setIsRestoring(true);
    try {
      await restorePurchases();
      await syncSubscription();
      await Promise.all([refreshCredits(), plansQuery.refetch()]);
      Toast.success(t('purchasesRestored'));
    } catch (err) {
      console.error(err);
      Toast.error(t('restoreError'));
    } finally {
      setIsRestoring(false);
    }
  };

  const handleManage = useManageSubscription();

  const renderPlans = () => {
    if (plansQuery.isLoading) return <PlansSkeleton />;
    return (
      <>
        {paidPlans.length > 0 ? (
          <PremiumPlanCard
            plans={paidPlans}
            offerings={offerings}
            currentPlanId={currentPlanId}
            purchasingId={purchasingId}
            onSubscribe={(planId) => handlePurchase(planId, t('subscriptionConfirmed'))}
            onManage={handleManage}
          />
        ) : null}
        {freePlan ? <FreePlanRow plan={freePlan} isCurrent={(currentPlanId ?? freePlan.id) === freePlan.id} /> : null}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topInset,
            paddingBottom: insets.bottom + Metrics.spacing.xl,
          },
        ]}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.leaf} colors={[colors.leaf]} />
        }
      >
        <View style={styles.header}>
          <PageTitle>{t('profile:plansTitle')}</PageTitle>
          <PlanSummary credits={credits} />
        </View>

        <View style={styles.plans}>{renderPlans()}</View>

        {creditPacks.length > 0 ? (
          <InfoSection title={t('creditPacks')}>
            <Text style={styles.sectionHint}>{t('creditPacksSubtitle')}</Text>
            <CreditPackPicker
              packs={creditPacks}
              offerings={offerings}
              purchasingId={purchasingId}
              onBuy={(packId) => handlePurchase(packId, t('creditsAddedToAccount'))}
            />
          </InfoSection>
        ) : null}

        <View style={styles.footer}>
          <TextButton label={isRestoring ? t('processing') : t('restorePurchases')} onPress={handleRestore} disabled={isRestoring} />
          <TextButton label={t('privacyPolicy')} onPress={() => router.push('/profile/privacy')} accessibilityRole="link" />
        </View>
      </ScrollView>
      <FloatingScreenControls />
    </View>
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
      paddingHorizontal: Metrics.spacing.lg,
    },
    header: {
      gap: Metrics.spacing.lg,
      marginBottom: Metrics.spacing.xl,
    },
    plans: {
      gap: Metrics.spacing.md,
      marginBottom: Metrics.spacing.xl,
    },
    sectionHint: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
      marginTop: -Metrics.spacing.sm,
      marginBottom: Metrics.spacing.md,
    },
    footer: {
      alignItems: 'center',
      gap: Metrics.spacing.md,
    },
  });
