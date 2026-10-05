import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Elevation, Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';

export type FilterChipOption<T> = {
  value: T;
  label: string;
  icon?: LucideIcon;
  color?: string;
};

type FilterChipRowProps<T> = {
  options: FilterChipOption<T>[];
  selected: readonly T[];
  onChange: (value: T) => void;
  trailing?: ReactNode;
  floating?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function FilterChipRow<T>({ options, selected, onChange, trailing, floating = false, style }: Readonly<FilterChipRowProps<T>>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const activeColor = floating ? colors.leafForeground : colors.leaf;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.row, style]}>
      {options.map((option) => {
        const isSelected = selected.includes(option.value);
        const Icon = option.icon;
        return (
          <Pressable
            key={String(option.value)}
            style={[
              styles.chip,
              floating && styles.chipFloating,
              isSelected && (floating ? styles.chipFloatingActive : styles.chipActive),
            ]}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
          >
            {Icon ? (
              <Icon
                size={Metrics.chip.md.iconSize}
                color={isSelected ? activeColor : (option.color ?? colors.mutedForeground)}
                strokeWidth={Metrics.icon.stroke.regular}
              />
            ) : null}
            <Text
              style={[
                styles.chipText,
                floating && styles.chipTextFloating,
                isSelected && (floating ? styles.chipTextFloatingActive : styles.chipTextActive),
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
      {trailing}
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: Metrics.spacing.sm,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.chip.md.gap,
      backgroundColor: colors.muted,
      borderRadius: Metrics.radius.full,
      paddingVertical: Metrics.chip.md.paddingVertical,
      paddingHorizontal: Metrics.chip.md.paddingHorizontal,
    },
    chipActive: {
      backgroundColor: colors.leafForeground,
    },
    chipFloating: {
      backgroundColor: colors.card,
      ...Elevation.low,
      shadowColor: colors.black,
    },
    chipFloatingActive: {
      backgroundColor: colors.leaf,
    },
    chipText: {
      ...Typography.label,
      color: colors.mutedForeground,
    },
    chipTextActive: {
      color: colors.leaf,
    },
    chipTextFloating: {
      color: colors.foreground,
    },
    chipTextFloatingActive: {
      color: colors.leafForeground,
    },
  });
