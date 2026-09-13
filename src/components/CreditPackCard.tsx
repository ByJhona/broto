import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { Card } from './Card';
import { SkeletonBlock } from './Skeleton';

type CreditPackCardProps = {
  icon: LucideIcon;
  name: string;
  price: string;
  ctaLabel: string;
  onPressCta: () => void;
};

export function CreditPackCard({ icon: Icon, name, price, ctaLabel, onPressCta }: Readonly<CreditPackCardProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Icon size={Metrics.icon.normal} color={colors.primary} strokeWidth={Metrics.icon.strokeWidth} />
        </View>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.price}>{price}</Text>
      </View>

      <Pressable style={styles.cta} onPress={onPressCta}>
        <Text style={styles.ctaText}>{ctaLabel}</Text>
      </Pressable>
    </Card>
  );
}

export function CreditPackCardSkeleton() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Card>
      <View style={styles.row}>
        <SkeletonBlock width={48} height={48} radius={Metrics.radius.md} style={styles.skeletonIconGap} />
        <SkeletonBlock width="40%" height={16} />
      </View>
    </Card>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
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
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
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
  });
