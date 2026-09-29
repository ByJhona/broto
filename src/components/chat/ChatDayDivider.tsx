import { StyleSheet, Text } from 'react-native';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { formatRelativeDay } from '@/utils';

export function ChatDayDivider({ date }: Readonly<{ date: Date }>) {
  const styles = useThemedStyles(makeStyles);
  return <Text style={styles.label}>{formatRelativeDay(date)}</Text>;
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    label: {
      ...Typography.captionLabel,
      color: colors.mutedForeground,
      alignSelf: 'center',
      backgroundColor: colors.muted,
      borderRadius: Metrics.radius.full,
      overflow: 'hidden',
      paddingVertical: Metrics.spacing.xs,
      paddingHorizontal: Metrics.spacing.md,
      marginTop: Metrics.spacing.lg,
      marginBottom: Metrics.spacing.sm,
    },
  });
