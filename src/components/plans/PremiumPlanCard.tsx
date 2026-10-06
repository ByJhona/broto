import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import CircleCheck from 'lucide-react-native/icons/circle-check';
import CreditCard from 'lucide-react-native/icons/credit-card';
import Crown from 'lucide-react-native/icons/crown';
import PiggyBank from 'lucide-react-native/icons/piggy-bank';
import { PACKAGE_TYPE } from 'react-native-purchases';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { findStorePackage, type PlanCatalogItem } from '@/services';
import { planBenefits } from '@/utils';
import { Card } from '../Card';
import { IconBadge } from '../IconBadge';
import { InfoChip } from '../InfoChip';
import { Button } from '../Button';
import { SegmentedControl } from '../SegmentedControl';
import { annualSavingsPercent, billingLabelKey, monthlyPlanId, pricePeriodKey, type StoreOfferings } from './storePricing';

type PremiumPlanCardProps = {
  plans: PlanCatalogItem[];
  offerings: StoreOfferings;
  currentPlanId: string | null;
  purchasingId: string | null;
  onSubscribe: (planId: string) => void;
  onManage: () => void;
};

export function PremiumPlanCard({ plans, offerings, currentPlanId, purchasingId, onSubscribe, onManage }: Readonly<PremiumPlanCardProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('credits');
  const [pickedId, setPickedId] = useState<string | null>(null);
  const subscribedId = plans.find((plan) => plan.id === currentPlanId)?.id;
  const selectedId = pickedId ?? subscribedId ?? monthlyPlanId(plans, offerings);
  const selectedPlan = plans.find((plan) => plan.id === selectedId) ?? plans[0];
  const selectedPackage = findStorePackage(offerings, selectedPlan.id);
  const packages = plans.map((plan) => findStorePackage(offerings, plan.id));
  const savings = annualSavingsPercent(packages);
  const isSubscribed = !!subscribedId;
  const isAnnual = selectedPackage?.packageType === PACKAGE_TYPE.ANNUAL;
  const pricePerMonth = isAnnual ? selectedPackage.product.pricePerMonthString : null;

  const options = plans.map((plan, index) => {
    const labelKey = billingLabelKey(packages[index]);
    return { value: plan.id, label: labelKey ? t(labelKey) : plan.name };
  });

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <IconBadge size={Metrics.size.lg} backgroundColor={colors.leaf}>
          <Crown size={Metrics.icon.normal} color={colors.leafForeground} strokeWidth={Metrics.icon.stroke.regular} />
        </IconBadge>
        <Text style={styles.name}>{selectedPlan.name}</Text>
        {isSubscribed ? <InfoChip size="sm" icon={CircleCheck} value={t('yourPlan')} /> : null}
      </View>

      {plans.length > 1 ? <SegmentedControl options={options} value={selectedPlan.id} onChange={setPickedId} /> : null}

      <View style={styles.priceBlock}>
        <Text style={styles.price}>
          {selectedPackage ? t(pricePeriodKey(selectedPackage), { price: selectedPackage.product.priceString }) : t('comingSoon')}
        </Text>
        {pricePerMonth ? <Text style={styles.priceHint}>{t('pricePerMonthEquivalent', { price: pricePerMonth })}</Text> : null}
        {isAnnual && savings ? (
          <View style={styles.savings}>
            <InfoChip size="sm" icon={PiggyBank} value={t('annualSavings', { percent: savings })} tintColor={colors.primary} />
          </View>
        ) : null}
      </View>

      <View style={styles.benefits}>
        {planBenefits(selectedPlan).map((benefit) => (
          <View key={benefit.kind} style={styles.benefit}>
            <CircleCheck size={Metrics.icon.small} color={colors.leaf} strokeWidth={Metrics.icon.stroke.regular} />
            <Text style={styles.benefitText}>{benefit.text}</Text>
          </View>
        ))}
      </View>

      {isSubscribed ? (
        <Button variant="outline" label={t('manageSubscription')} icon={CreditCard} onPress={onManage} />
      ) : (
        <Button
          label={t('subscribeTo', { planName: selectedPlan.name })}
          onPress={() => onSubscribe(selectedPlan.id)}
          loading={purchasingId === selectedPlan.id}
          disabled={!!purchasingId}
        />
      )}
      <Text style={styles.notice}>{Platform.OS === 'ios' ? t('autoRenewNoticeIos') : t('autoRenewNoticeAndroid')}</Text>
    </Card>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      gap: Metrics.spacing.md,
      borderWidth: Metrics.borderWidth.lg,
      borderColor: colors.leaf,
      padding: Metrics.spacing.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.md,
    },
    name: {
      flex: 1,
      ...Typography.title,
      color: colors.foreground,
    },
    priceBlock: {
      gap: Metrics.spacing.xs,
    },
    price: {
      ...Typography.headline,
      color: colors.foreground,
    },
    priceHint: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
    },
    savings: {
      flexDirection: 'row',
    },
    benefits: {
      gap: Metrics.spacing.sm,
    },
    benefit: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.sm,
    },
    benefitText: {
      flex: 1,
      ...Typography.bodySmall,
      color: colors.foreground,
    },
    notice: {
      ...Typography.caption,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
  });
