import { StyleSheet, Text, View } from 'react-native';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import type { FollowCounts, XpProgress } from '@/types';

type ProfileStatsProps = {
  counts: FollowCounts;
  xp: XpProgress;
};

function StatItem({ value, label }: Readonly<{ value: number; label: string }>) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.stat}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

function xpLabel(xp: XpProgress, t: (key: string, options?: Record<string, unknown>) => string): string {
  if (xp.xpToNextLevel === null) return t('maxLevelReached');
  return t('xpToNextLevel', { xp: xp.xpToNextLevel, level: xp.level + 1 });
}

function xpFraction(xp: XpProgress): number {
  if (xp.xpToNextLevel === null) return 1;
  const span = xp.currentLevelXp + xp.xpToNextLevel;
  return span > 0 ? xp.currentLevelXp / span : 0;
}

export function ProfileStats({ counts, xp }: Readonly<ProfileStatsProps>) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('profile');

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <StatItem value={counts.followers} label={t('followers')} />
        <View style={styles.divider} />
        <StatItem value={counts.following} label={t('following')} />
        <View style={styles.divider} />
        <StatItem value={xp.level} label={t('level')} />
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(xpFraction(xp) * 100)}%` }]} />
      </View>
      <Text style={styles.xpLabel}>{xpLabel(xp, t)}</Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      gap: Metrics.spacing.sm,
      padding: Metrics.spacing.md,
      borderRadius: Metrics.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Metrics.spacing.xs,
    },
    stat: {
      flex: 1,
      alignItems: 'center',
    },
    divider: {
      width: StyleSheet.hairlineWidth,
      alignSelf: 'stretch',
      backgroundColor: colors.border,
    },
    value: {
      ...Typography.title,
      color: colors.foreground,
    },
    label: {
      ...Typography.caption,
      color: colors.mutedForeground,
    },
    progressTrack: {
      height: Metrics.spacing.sm,
      borderRadius: Metrics.radius.full,
      backgroundColor: colors.muted,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: Metrics.radius.full,
      backgroundColor: colors.leaf,
    },
    xpLabel: {
      ...Typography.caption,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
  });
