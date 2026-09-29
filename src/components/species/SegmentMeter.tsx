import { StyleSheet, View } from 'react-native';
import { Metrics, type ThemeColors, useThemedStyles } from '@/theme';

type SegmentMeterProps = {
  value: number;
  total: number;
};

export function SegmentMeter({ value, total }: Readonly<SegmentMeterProps>) {
  const styles = useThemedStyles(makeStyles);
  const steps = Array.from({ length: total }, (_, index) => index + 1);

  return (
    <View style={styles.row} accessible={false} importantForAccessibility="no-hide-descendants">
      {steps.map((step) => (
        <View key={step} style={[styles.segment, step <= value && styles.segmentFilled]} />
      ))}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: Metrics.spacing.xs,
    },
    segment: {
      width: Metrics.size.dot,
      height: Metrics.size.dot,
      borderRadius: Metrics.radius.sm / 2,
      backgroundColor: colors.border,
    },
    segmentFilled: {
      backgroundColor: colors.leaf,
    },
  });
