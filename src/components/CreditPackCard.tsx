import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Colors, Metrics } from '@/theme';
import { SkeletonBlock } from './Skeleton';

type CreditPackCardProps = {
  icon: LucideIcon;
  name: string;
  price: string;
  ctaLabel: string;
  onPressCta: () => void;
};

export function CreditPackCard({ icon: Icon, name, price, ctaLabel, onPressCta }: CreditPackCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Icon size={Metrics.icon.normal} color={Colors.primary} strokeWidth={Metrics.icon.strokeWidth} />
        </View>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.price}>{price}</Text>
      </View>

      <Pressable style={styles.cta} onPress={onPressCta}>
        <Text style={styles.ctaText}>{ctaLabel}</Text>
      </Pressable>
    </View>
  );
}

export function CreditPackCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <SkeletonBlock width={48} height={48} radius={Metrics.radius.md} style={styles.skeletonIconGap} />
        <SkeletonBlock width="40%" height={16} />
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
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
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
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
});
