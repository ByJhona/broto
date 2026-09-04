import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Gem, Zap } from 'lucide-react-native';
import { Colors, Metrics } from '@/theme';
import { CreditPackCard, LoadingScreen, PlanCard, SectionTitle } from '@/components';
import { useCredits } from '@/hooks';
import {
  getCreditPacks,
  getOfferings,
  getPlanCatalog,
  isPurchasesAvailable,
  purchasePackage,
  type CreditPack,
  type PlanCatalogItem,
} from '@/services';
import { Toast } from '@/utils';

const CREDIT_PACK_ICONS = [Zap, Gem];

function formatPrice(cents: number): string {
  if (cents === 0) return 'R$ 0';
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

export default function PlansScreen() {
  const { credits, refresh: refreshCredits } = useCredits();
  const [plans, setPlans] = useState<PlanCatalogItem[]>([]);
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const isFirstFocus = useRef(true);

  const loadCatalog = useCallback(async () => {
    const [planList, packList] = await Promise.all([getPlanCatalog(), getCreditPacks()]);
    setPlans(planList);
    setCreditPacks(packList);
  }, []);

  useEffect(() => {
    Promise.all([getPlanCatalog(), getCreditPacks()]).then(([planList, packList]) => {
      setPlans(planList);
      setCreditPacks(packList);
      setIsLoading(false);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      refreshCredits();
    }, [refreshCredits])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadCatalog(), refreshCredits()]);
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
      Toast.success(successMessage);
    } catch (err) {
      Toast.error(err instanceof Error ? err.message : 'Não foi possível concluir a compra.');
    } finally {
      setPurchasingId(null);
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={Colors.leaf} colors={[Colors.leaf]} />
      }
    >
      <SectionTitle>Planos</SectionTitle>

      {plans.map((plan) => {
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
            ctaLabel={
              plan.priceCents === 0 ? undefined : purchasingId === plan.id ? 'Processando...' : 'Assinar'
            }
            onPressCta={
              plan.priceCents === 0 ? undefined : () => handlePurchase(plan.id, 'Sua assinatura foi confirmada.')
            }
          />
        );
      })}

      {creditPacks.length > 0 ? (
        <>
          <SectionTitle style={styles.sectionTitle}>Créditos avulsos</SectionTitle>
          {creditPacks.map((pack, index) => (
            <CreditPackCard
              key={pack.id}
              icon={CREDIT_PACK_ICONS[index % CREDIT_PACK_ICONS.length]}
              name={pack.name}
              price={formatPrice(pack.priceCents)}
              ctaLabel={purchasingId === pack.id ? 'Processando...' : 'Comprar'}
              onPressCta={() => handlePurchase(pack.id, 'Créditos adicionados à sua conta.')}
            />
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Metrics.spacing.lg,
    gap: Metrics.spacing.md,
  },
  sectionTitle: {
    marginTop: Metrics.spacing.sm,
  },
});
