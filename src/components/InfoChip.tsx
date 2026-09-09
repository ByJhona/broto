import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import type { LucideIcon } from 'lucide-react-native';

type InfoChipProps = {
  value: string;
  icon: LucideIcon;
};

export function InfoChip({ value, icon: Icon }: Readonly<InfoChipProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.chip}>
      <Icon size={16} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
      <Text style={styles.chipText}>{value}</Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.xs,
      backgroundColor: colors.muted,
      borderRadius: Metrics.radius.full,
      paddingVertical: Metrics.spacing.sm,
      paddingHorizontal: Metrics.spacing.md,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.foreground,
    },
  });
