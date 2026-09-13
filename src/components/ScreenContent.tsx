import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Metrics } from '@/theme';

type ScreenContentProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export function ScreenContent({ children, style }: Readonly<ScreenContentProps>) {
  return <View style={[styles.content, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  content: {
    ...Metrics.layout.centeredContent,
    padding: Metrics.spacing.lg,
  },
});
