import { useMemo, type PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Metrics, useColors, type ThemeColors } from '@/theme';

type CardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  disabled?: boolean;
}>;

export function Card({ children, style, onPress, disabled }: Readonly<CardProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (onPress) {
    return (
      <Pressable style={[styles.card, style]} onPress={onPress} disabled={disabled}>
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
