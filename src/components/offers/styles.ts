import { StyleSheet } from 'react-native';
import { Metrics, type ThemeColors, Typography } from '@/theme';

export const makeRowStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      marginBottom: Metrics.spacing.sm,
    },
    thumbWrapper: {
      position: 'relative',
    },
    thumbBadge: {
      position: 'absolute',
      bottom: -Metrics.spacing.xs,
      right: -Metrics.spacing.xs,
    },
    typeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.chip.sm.gap,
      borderRadius: Metrics.radius.full,
      paddingVertical: Metrics.chip.sm.paddingVertical,
      paddingHorizontal: Metrics.chip.sm.paddingHorizontal,
    },
    typeBadgeText: {
      ...Typography.captionStrong,
      color: colors.white,
    },
    trailingColumn: {
      alignItems: 'flex-end',
      gap: Metrics.spacing.xs,
    },
    statusPill: {
      borderRadius: Metrics.radius.full,
      paddingVertical: Metrics.chip.sm.paddingVertical,
      paddingHorizontal: Metrics.chip.sm.paddingHorizontal,
      backgroundColor: colors.muted,
    },
    statusPillText: {
      ...Typography.captionLabel,
      color: colors.mutedForeground,
    },
  });
