import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Metrics, useColors, type ThemeColors } from '@/theme';

export type PillOption<T extends string> = {
  value: T;
  label: string;
  icon?: LucideIcon;
  color?: string;
};

type PillSelectorProps<T extends string> = {
  options: PillOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function PillSelector<T extends string>({ options, value, onChange }: Readonly<PillSelectorProps<T>>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      {options.map((option) => {
        const selected = option.value === value;
        const Icon = option.icon;
        const selectedBackground = option.color ?? colors.primary;
        const selectedForeground = option.color ? colors.white : colors.primaryForeground;
        return (
          <Pressable
            key={option.value}
            style={[styles.pill, selected && { backgroundColor: selectedBackground, borderColor: selectedBackground }]}
            onPress={() => onChange(option.value)}
          >
            {Icon ? (
              <Icon size={14} color={selected ? selectedForeground : colors.foreground} strokeWidth={Metrics.icon.strokeWidth} />
            ) : null}
            <Text style={[styles.pillText, selected && { color: selectedForeground }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Metrics.spacing.xs,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: Metrics.radius.full,
      paddingVertical: 8,
      paddingHorizontal: Metrics.spacing.md,
      backgroundColor: colors.card,
    },
    pillText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.foreground,
    },
  });
