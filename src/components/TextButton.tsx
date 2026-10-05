import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { Metrics, Opacity, type ThemeColors, useThemedStyles, Typography } from '@/theme';

type TextButtonTone = 'muted' | 'primary' | 'leaf';

type TextButtonProps = {
  label: string;
  onPress: () => void;
  tone?: TextButtonTone;
  disabled?: boolean;
  accessibilityRole?: 'button' | 'link';
  style?: StyleProp<ViewStyle>;
};

export function TextButton({ label, onPress, tone = 'muted', disabled = false, accessibilityRole = 'button', style }: Readonly<TextButtonProps>) {
  const styles = useThemedStyles(makeStyles);

  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.pressed, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled}
      hitSlop={Metrics.hitSlop}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled }}
    >
      <Text style={styles[tone]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    button: {
      alignItems: 'center',
      padding: Metrics.spacing.sm,
    },
    pressed: {
      opacity: Opacity.pressed,
    },
    disabled: {
      opacity: Opacity.disabled,
    },
    muted: {
      ...Typography.label,
      color: colors.mutedForeground,
    },
    primary: {
      ...Typography.labelStrong,
      color: colors.primary,
    },
    leaf: {
      ...Typography.labelStrong,
      color: colors.leaf,
    },
  });
