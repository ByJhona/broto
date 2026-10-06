import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Metrics, type ThemeColors, useThemedStyles } from '@/theme';

type BottomBarProps = PropsWithChildren<{
  stickToKeyboard?: boolean;
}>;

export function BottomBar({ stickToKeyboard = false, children }: Readonly<BottomBarProps>) {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();

  const bar = (
    <View style={[styles.bar, { paddingBottom: insets.bottom + Metrics.spacing.md }]}>
      <View style={styles.content}>{children}</View>
    </View>
  );

  if (stickToKeyboard) return <KeyboardStickyView style={styles.anchor}>{bar}</KeyboardStickyView>;
  return <View style={styles.anchor}>{bar}</View>;
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    anchor: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
    },
    bar: {
      backgroundColor: colors.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingHorizontal: Metrics.spacing.lg,
      paddingTop: Metrics.spacing.md,
    },
    content: {
      ...Metrics.layout.centeredContent,
    },
  });
