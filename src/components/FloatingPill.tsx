import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Elevation, Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';

type FloatingPillProps = {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function FloatingPill({ label, icon: Icon, onPress, style }: Readonly<FloatingPillProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);

  return (
    <Pressable style={[styles.pill, style]} onPress={onPress} accessibilityRole="button">
      <Icon size={Metrics.icon.small} color={colors.primaryForeground} strokeWidth={Metrics.icon.strokeWidth} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    pill: {
      position: 'absolute',
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.xs,
      backgroundColor: colors.primary,
      borderRadius: Metrics.radius.full,
      paddingVertical: Metrics.spacing.sm,
      paddingHorizontal: Metrics.spacing.md,
      ...Elevation.medium,
      shadowColor: colors.black,
    },
    label: {
      color: colors.primaryForeground,
      ...Typography.labelStrong,
    },
  });
