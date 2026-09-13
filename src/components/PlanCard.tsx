import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Crown from 'lucide-react-native/icons/crown';
import Gift from 'lucide-react-native/icons/gift';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import type { Plan } from '@/types';
import { Card } from './Card';
import { SkeletonBlock } from './Skeleton';

type PlanCardProps = {
  plan: Plan;
  ctaLabel?: string;
  onPressCta?: () => void;
  isCurrent?: boolean;
};

export function PlanCard({ plan, ctaLabel, onPressCta, isCurrent }: Readonly<PlanCardProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isPremium = plan.id === 'premium';
  const Icon = isPremium ? Crown : Gift;

  return (
    <Card style={isCurrent ? styles.cardCurrent : undefined}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Icon size={Metrics.icon.normal} color={colors.primary} strokeWidth={Metrics.icon.strokeWidth} />
        </View>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{plan.name}</Text>
            {isCurrent ? (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>Plano atual</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.description}>{plan.description}</Text>
        </View>
        {plan.price ? <Text style={styles.price}>{plan.price}</Text> : null}
      </View>

      {!isCurrent && ctaLabel ? (
        <Pressable style={styles.cta} onPress={onPressCta}>
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

export function PlanCardSkeleton() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Card>
      <View style={styles.row}>
        <SkeletonBlock width={48} height={48} radius={Metrics.radius.md} style={styles.skeletonIconGap} />
        <View style={styles.info}>
          <SkeletonBlock width="50%" height={16} />
          <SkeletonBlock width="80%" height={13} style={styles.skeletonGap} />
        </View>
      </View>
    </Card>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  cardCurrent: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.xs,
  },
  currentBadge: {
    backgroundColor: `${colors.primary}1A`,
    borderRadius: Metrics.radius.full,
    paddingVertical: 2,
    paddingHorizontal: Metrics.spacing.sm,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: Metrics.radius.md,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Metrics.spacing.md,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
  },
  description: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  price: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.foreground,
  },
  cta: {
    marginTop: Metrics.spacing.md,
    alignItems: 'center',
    paddingVertical: Metrics.spacing.sm,
    borderRadius: Metrics.radius.md,
    backgroundColor: colors.primary,
  },
  ctaText: {
    color: colors.primaryForeground,
    fontWeight: '600',
    fontSize: 15,
  },
  skeletonIconGap: {
    marginRight: Metrics.spacing.md,
  },
  skeletonGap: {
    marginTop: Metrics.spacing.xs,
  },
  });
