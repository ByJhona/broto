import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Metrics, Elevation, useColors, type ThemeColors, useThemedStyles } from '@/theme';

type IconButtonProps = PropsWithChildren<{
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  backgroundColor?: string;
  elevated?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export function IconButton({
  children,
  onPress,
  accessibilityLabel,
  size = Metrics.size.md,
  backgroundColor,
  elevated = false,
  disabled = false,
  style,
}: Readonly<IconButtonProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const resolvedBackgroundColor = backgroundColor ?? colors.card;

  return (
    <Pressable
      style={[
        styles.button,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: resolvedBackgroundColor },
        elevated && styles.elevated,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
    >
      {children}
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    button: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    elevated: {
      ...Elevation.medium,
      shadowColor: colors.black,
    },
  });
