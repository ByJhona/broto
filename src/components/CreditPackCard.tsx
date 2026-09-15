import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { useTranslation } from '@/i18n';
import { Card } from './Card';
import { SkeletonBlock } from './Skeleton';

type CreditPackCardProps = {
  icon: LucideIcon;
  name: string;
  credits: number;
  price: string;
  ctaLabel: string;
  onPressCta: () => void;
};

export function CreditPackCard({ icon: Icon, name, credits, price, ctaLabel, onPressCta }: Readonly<CreditPackCardProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation('credits');

  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Icon size={Metrics.icon.normal} color={colors.primary} strokeWidth={Metrics.icon.strokeWidth} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.credits}>{t('packCredits', { count: credits })}</Text>
        </View>
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
        <View style={styles.info}>
          <SkeletonBlock width="50%" height={16} />
          <SkeletonBlock width="35%" height={13} style={styles.skeletonGap} />
        </View>
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
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
  },
  credits: {
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
