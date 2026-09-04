import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Colors } from '@/theme';

type IconBadgeProps = PropsWithChildren<{
  size?: number;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
}>;

export function IconBadge({ size = 40, backgroundColor = Colors.muted, style, children }: IconBadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size / 2, backgroundColor },
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
