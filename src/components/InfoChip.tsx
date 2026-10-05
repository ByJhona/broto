import { StyleSheet, Text, View } from 'react-native';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import type { LucideIcon } from 'lucide-react-native';

type InfoChipProps = {
  value: string;
  icon: LucideIcon;
  size?: 'md' | 'sm';
  tintColor?: string;
};

export function InfoChip({ value, icon: Icon, size = 'md', tintColor }: Readonly<InfoChipProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const color = tintColor ?? colors.leaf;
  const isCompact = size === 'sm';

  return (
    <View style={[styles.chip, isCompact && [styles.chipCompact, { backgroundColor: `${color}14` }]]}>
      <Icon size={isCompact ? Metrics.chip.sm.iconSize : Metrics.chip.md.iconSize} color={color} strokeWidth={Metrics.icon.stroke.regular} />
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
      gap: Metrics.chip.md.gap,
      backgroundColor: colors.muted,
      borderRadius: Metrics.radius.full,
      paddingVertical: Metrics.chip.md.paddingVertical,
      paddingHorizontal: Metrics.chip.md.paddingHorizontal,
    },
    chipCompact: {
      gap: Metrics.chip.sm.gap,
      paddingVertical: Metrics.chip.sm.paddingVertical,
      paddingHorizontal: Metrics.chip.sm.paddingHorizontal,
    },
    chipText: {
      ...Typography.label,
      color: colors.foreground,
    },
    chipTextCompact: {
      flexShrink: 1,
      ...Typography.caption,
    },
  });
