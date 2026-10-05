import { useEffect, useState } from 'react';
import { Animated, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { Metrics, useColors, Motion, Opacity } from '@/theme';

type SkeletonBlockProps = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export function SkeletonBlock({ width = '100%', height = Metrics.fontSize.small, radius = Metrics.radius.sm, style }: Readonly<SkeletonBlockProps>) {
  const colors = useColors();
  const [opacity] = useState(() => new Animated.Value(Opacity.placeholder));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: Motion.pulse, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: Opacity.placeholder, duration: Motion.pulse, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.muted, opacity }, style]}
    />
  );
}
