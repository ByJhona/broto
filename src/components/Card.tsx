import { type PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Metrics, type ThemeColors, useThemedStyles } from '@/theme';

type CardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
}>;

export function Card({ children, style, onPress, onLongPress, disabled }: Readonly<CardProps>) {
  const styles = useThemedStyles(makeStyles);

  if (onPress || onLongPress) {
    return (
      <Pressable style={[styles.card, style]} onPress={onPress} onLongPress={onLongPress} disabled={disabled}>
        {children}
      </Pressable>
    );
  }

  return <View style={[styles.card, style]}>{children}</View>;
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: Metrics.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Metrics.spacing.md,
    },
  });
