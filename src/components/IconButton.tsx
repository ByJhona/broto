import type { PropsWithChildren } from 'react';
import { useMemo } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useColors, type ThemeColors } from '@/theme';

type IconButtonProps = PropsWithChildren<{
  onPress: () => void;
  size?: number;
  backgroundColor?: string;
  elevated?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export function IconButton({
  children,
  onPress,
  size = 40,
  backgroundColor,
  elevated = false,
  disabled = false,
  style,
}: Readonly<IconButtonProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
      elevation: 4,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
  });
