import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Metrics, useColors, type ThemeColors } from '@/theme';

type StatusBadgeProps = {
  label: string;
};

export function StatusBadge({ label }: Readonly<StatusBadgeProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    badge: {
      position: 'absolute',
      top: Metrics.spacing.xs,
      right: Metrics.spacing.xs,
      backgroundColor: colors.black,
      opacity: 0.75,
      borderRadius: Metrics.radius.full,
      paddingVertical: 2,
      paddingHorizontal: 8,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.white,
    },
  });
