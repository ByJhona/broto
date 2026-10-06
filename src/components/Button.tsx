import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Metrics, Opacity, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'destructive';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: LucideIcon;
  compact?: boolean;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

function contentColor(variant: ButtonVariant, colors: ThemeColors): string {
  if (variant === 'primary') return colors.primaryForeground;
  if (variant === 'secondary') return colors.foreground;
  if (variant === 'destructive') return colors.destructive;
  return colors.leaf;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon: Icon,
  compact = false,
  loading = false,
  disabled = false,
  style,
}: Readonly<ButtonProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const isDisabled = loading || disabled;
  const color = contentColor(variant, colors);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        compact && styles.compact,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? <ActivityIndicator size="small" color={color} /> : null}
      {!loading && Icon ? <Icon size={Metrics.icon.small} color={color} strokeWidth={Metrics.icon.stroke.regular} /> : null}
      <Text style={[compact ? styles.labelCompact : styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Metrics.spacing.sm,
      borderRadius: Metrics.radius.full,
      paddingVertical: Metrics.spacing.md,
      paddingHorizontal: Metrics.spacing.lg,
    },
    compact: {
      paddingVertical: Metrics.spacing.sm,
      paddingHorizontal: Metrics.spacing.md,
    },
    primary: {
      backgroundColor: colors.primary,
    },
    secondary: {
      backgroundColor: colors.card,
      borderWidth: Metrics.borderWidth.sm,
      borderColor: colors.border,
    },
    outline: {
      borderWidth: Metrics.borderWidth.md,
      borderColor: colors.leaf,
    },
    destructive: {
      borderWidth: Metrics.borderWidth.md,
      borderColor: colors.destructive,
    },
    pressed: {
      opacity: Opacity.pressed,
    },
    disabled: {
      opacity: Opacity.disabled,
    },
    label: {
      ...Typography.headingMedium,
    },
    labelCompact: {
      ...Typography.label,
    },
  });
