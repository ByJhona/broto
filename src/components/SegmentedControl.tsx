import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Metrics, useColors, type ThemeColors } from '@/theme';

export type SegmentedControlOption<T> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
  compact = false,
}: Readonly<SegmentedControlProps<T>>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={[styles.track, compact && styles.trackCompact, style]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            style={[styles.segment, !compact && styles.segmentFill, compact && styles.segmentCompact, selected && styles.segmentActive]}
            onPress={() => onChange(option.value)}
          >
            <Text style={[styles.label, compact && styles.labelCompact, selected && styles.labelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    track: {
      flexDirection: 'row',
      backgroundColor: colors.muted,
      borderRadius: Metrics.radius.full,
      padding: 4,
      gap: 4,
    },
    trackCompact: {
      padding: 2,
      gap: 2,
    },
    segment: {
      alignItems: 'center',
      paddingVertical: Metrics.spacing.sm,
      borderRadius: Metrics.radius.full,
    },
    segmentFill: {
      flex: 1,
    },
    segmentCompact: {
      paddingVertical: 5,
      paddingHorizontal: Metrics.spacing.sm,
    },
    segmentActive: {
      backgroundColor: colors.card,
      elevation: 2,
      shadowColor: colors.foreground,
      shadowOpacity: 0.1,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.mutedForeground,
    },
    labelCompact: {
      fontSize: 12,
    },
    labelActive: {
      color: colors.foreground,
    },
  });
