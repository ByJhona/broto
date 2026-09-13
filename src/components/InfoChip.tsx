import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import type { LucideIcon } from 'lucide-react-native';

type InfoChipProps = {
  value: string;
  icon: LucideIcon;
  size?: 'md' | 'sm';
  tintColor?: string;
};

export function InfoChip({ value, icon: Icon, size = 'md', tintColor }: Readonly<InfoChipProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const color = tintColor ?? colors.leaf;
  const isCompact = size === 'sm';

  return (
    <View style={[styles.chip, isCompact && [styles.chipCompact, { backgroundColor: `${color}14` }]]}>
      <Icon size={isCompact ? 13 : 16} color={color} strokeWidth={Metrics.icon.strokeWidth} />
      <Text
        style={[styles.chipText, isCompact && [styles.chipTextCompact, { color }]]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
      gap: Metrics.spacing.xs,
      backgroundColor: colors.muted,
      borderRadius: Metrics.radius.full,
      paddingVertical: Metrics.spacing.sm,
      paddingHorizontal: Metrics.spacing.md,
    },
    chipCompact: {
      gap: 4,
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.foreground,
    },
    chipTextCompact: {
      flexShrink: 1,
      fontSize: 11,
    },
  });
