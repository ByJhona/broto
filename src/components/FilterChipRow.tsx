import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { Metrics, useColors, type ThemeColors } from '@/theme';

export type FilterChipOption<T> = {
  value: T;
  label: string;
};

type FilterChipRowProps<T> = {
  options: FilterChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
};

export function FilterChipRow<T>({ options, value, onChange, style }: Readonly<FilterChipRowProps<T>>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.row, style]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable key={option.label} style={[styles.chip, selected && styles.chipActive]} onPress={() => onChange(option.value)}>
            <Text style={[styles.chipText, selected && styles.chipTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 6,
    },
    chip: {
      backgroundColor: colors.muted,
      borderRadius: Metrics.radius.full,
      paddingVertical: 6,
      paddingHorizontal: Metrics.spacing.md,
    },
    chipActive: {
      backgroundColor: colors.leafForeground,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.mutedForeground,
    },
    chipTextActive: {
      color: colors.leaf,
    },
  });
