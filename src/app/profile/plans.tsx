import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Gem from 'lucide-react-native/icons/gem';
import Zap from 'lucide-react-native/icons/zap';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { CreditPackCard, CreditPackCardSkeleton, PlanCard, PlanCardSkeleton, SectionTitle } from '@/components';
import { useCredits } from '@/hooks';
import {
  CATALOG_STALE_TIME,
  CREDIT_PACKS_QUERY_KEY,
  getCreditPacks,
  getOfferings,
  getPlanCatalog,
  isPurchasesAvailable,
  isUserCancelledPurchase,
  PLAN_CATALOG_QUERY_KEY,
  purchasePackage,
  type PlanCatalogItem,
} from '@/services';
import { Toast } from '@/utils';

const CREDIT_PACK_ICONS = [Zap, Gem];

function formatPrice(cents: number): string {
  if (cents === 0) return 'R$ 0';
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

function getPlanCtaLabel(plan: PlanCatalogItem, purchasingId: string | null): string | undefined {
  if (plan.priceCents === 0) return undefined;
  return purchasingId === plan.id ? 'Processando...' : 'Assinar';
}

export default function PlansScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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

  const plans = plansQuery.data ?? [];
  const creditPacks = creditPacksQuery.data ?? [];
  const isLoading = plansQuery.isLoading || creditPacksQuery.isLoading;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([plansQuery.refetch(), creditPacksQuery.refetch(), refreshCredits()]);
    setIsRefreshing(false);
  };

  const handlePurchase = async (productId: string, successMessage: string) => {
    if (purchasingId) return;

    if (!(await isPurchasesAvailable())) {
      Toast.info('A loja está sendo preparada. Volte em breve.');
      return;
    }

    setPurchasingId(productId);
    try {
      const offerings = await getOfferings();
      const pkg = offerings?.current?.availablePackages.find(
        (item) => item.identifier === productId || item.product.identifier === productId
      );

      if (!pkg) {
        Toast.error('Isso ainda não está publicado nas lojas.');
        return;
      }

      await purchasePackage(pkg);
      await refreshCredits();
      setTimeout(refreshCredits, 2500);
      Toast.success(successMessage);
    } catch (err) {
      if (!isUserCancelledPurchase(err)) {
        Toast.error(err instanceof Error ? err.message : 'Não foi possível concluir a compra.');
      }
    } finally {
      setPurchasingId(null);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
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
                price: plan.priceCents === 0 ? 'Grátis' : `${formatPrice(plan.priceCents)}/mês`,
              }}
              isCurrent={isCurrent}
              ctaLabel={getPlanCtaLabel(plan, purchasingId)}
              onPressCta={
                plan.priceCents === 0 ? undefined : () => handlePurchase(plan.id, 'Sua assinatura foi confirmada.')
              }
            />
          );
        })
      )}

      {isLoading || creditPacks.length > 0 ? (
        <>
          <SectionTitle style={styles.sectionTitle}>Créditos avulsos</SectionTitle>
          {isLoading ? (
            <>
              <CreditPackCardSkeleton />
              <CreditPackCardSkeleton />
            </>
          ) : (
            creditPacks.map((pack, index) => (
              <CreditPackCard
                key={pack.id}
                icon={CREDIT_PACK_ICONS[index % CREDIT_PACK_ICONS.length]}
                name={pack.name}
                price={formatPrice(pack.priceCents)}
                ctaLabel={purchasingId === pack.id ? 'Processando...' : 'Comprar'}
                onPressCta={() => handlePurchase(pack.id, 'Créditos adicionados à sua conta.')}
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
    padding: Metrics.spacing.lg,
    gap: Metrics.spacing.md,
  },
  sectionTitle: {
    marginTop: Metrics.spacing.sm,
  },
  });
