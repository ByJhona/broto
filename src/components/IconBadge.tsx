import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Metrics, useColors } from '@/theme';

type IconBadgeProps = PropsWithChildren<{
  size?: number;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
}>;

export function IconBadge({ size = Metrics.size.md, backgroundColor, style, children }: Readonly<IconBadgeProps>) {
  const colors = useColors();
  const resolvedBackgroundColor = backgroundColor ?? colors.muted;

  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: resolvedBackgroundColor },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
