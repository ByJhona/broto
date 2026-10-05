import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography, Opacity } from '@/theme';

type OutlineButtonProps = {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function OutlineButton({ label, icon: Icon, onPress, loading = false, disabled = false, style }: Readonly<OutlineButtonProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const isDisabled = loading || disabled;

  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.pressed, isDisabled && styles.disabled, style]}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.leaf} />
      ) : (
        <Icon size={Metrics.icon.small} color={colors.leaf} strokeWidth={Metrics.icon.stroke.regular} />
      )}
      <Text style={styles.label}>{label}</Text>
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
      borderWidth: Metrics.borderWidth.md,
      borderColor: colors.leaf,
      paddingVertical: Metrics.spacing.md,
      paddingHorizontal: Metrics.spacing.lg,
    },
    pressed: {
      backgroundColor: colors.muted,
    },
    disabled: {
      opacity: Opacity.disabled,
    },
    label: {
      ...Typography.labelStrong,
      color: colors.leaf,
    },
  });
