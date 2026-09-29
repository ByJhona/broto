import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Elevation, Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';

export type SegmentedControlOption<T> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
};

export function SegmentedControl<T extends string>({ options, value, onChange, style }: Readonly<SegmentedControlProps<T>>) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={[styles.track, style]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            style={[styles.segment, selected && styles.segmentActive]}
            onPress={() => onChange(option.value)}
          >
            <Text style={[styles.label, selected && styles.labelActive]}>{option.label}</Text>
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
      padding: Metrics.spacing.xs,
      gap: Metrics.spacing.xs,
    },
    segment: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: Metrics.spacing.sm,
      borderRadius: Metrics.radius.full,
    },
    segmentActive: {
      backgroundColor: colors.card,
      ...Elevation.low,
      shadowColor: colors.foreground,
    },
    label: {
      ...Typography.label,
      color: colors.mutedForeground,
    },
    labelActive: {
      color: colors.foreground,
    },
  });
