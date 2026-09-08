import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Crown, Gift } from 'lucide-react-native';
import { Colors, Metrics } from '@/theme';
import type { Plan } from '@/types';
import { SkeletonBlock } from './Skeleton';

type PlanCardProps = {
  plan: Plan;
  ctaLabel?: string;
  onPressCta?: () => void;
  isCurrent?: boolean;
};

export function PlanCard({ plan, ctaLabel, onPressCta, isCurrent }: PlanCardProps) {
  const isPremium = plan.id === 'premium';
  const Icon = isPremium ? Crown : Gift;

  return (
    <View style={[styles.card, isCurrent && styles.cardCurrent]}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Icon size={Metrics.icon.normal} color={Colors.primary} strokeWidth={Metrics.icon.strokeWidth} />
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
    </View>
  );
}

export function PlanCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <SkeletonBlock width={48} height={48} radius={Metrics.radius.md} style={styles.skeletonIconGap} />
        <View style={styles.info}>
          <SkeletonBlock width="50%" height={16} />
          <SkeletonBlock width="80%" height={13} style={styles.skeletonGap} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Metrics.radius.lg,
    padding: Metrics.spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardCurrent: {
    borderColor: Colors.primary,
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
    backgroundColor: `${Colors.primary}1A`,
    borderRadius: Metrics.radius.full,
    paddingVertical: 2,
    paddingHorizontal: Metrics.spacing.sm,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: Metrics.radius.md,
    backgroundColor: Colors.secondary,
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
    color: Colors.foreground,
  },
  description: {
    fontSize: 13,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  price: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.foreground,
  },
  cta: {
    marginTop: Metrics.spacing.md,
    alignItems: 'center',
    paddingVertical: Metrics.spacing.sm,
    borderRadius: Metrics.radius.md,
    backgroundColor: Colors.primary,
  },
  ctaText: {
    color: Colors.primaryForeground,
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
