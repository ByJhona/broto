import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Plus from 'lucide-react-native/icons/plus';
import { Metrics, useColors } from '@/theme';
import { useReduceMotion } from '@/hooks';
import { IconButton } from './IconButton';

const TRANSITION_DURATION_MS = 200;
const HIDDEN_SCALE = 0.6;
const HIDDEN_OFFSET = Metrics.spacing.lg;

type FloatingCreateButtonProps = {
  visible: boolean;
  accessibilityLabel: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function FloatingCreateButton({ visible, accessibilityLabel, onPress, style }: Readonly<FloatingCreateButtonProps>) {
  const colors = useColors();
  const reduceMotion = useReduceMotion();
  const [progress] = useState(() => new Animated.Value(visible ? 1 : 0));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: reduceMotion ? 0 : TRANSITION_DURATION_MS,
      easing: visible ? Easing.out(Easing.back(1.5)) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, reduceMotion, progress]);

  const motion = {
    opacity: progress,
    transform: [
      { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [HIDDEN_SCALE, 1] }) },
      { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [HIDDEN_OFFSET, 0] }) },
    ],
  };

  return (
    <Animated.View
      style={[styles.container, style, motion]}
      pointerEvents={visible ? 'box-none' : 'none'}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
    >
      <IconButton
        accessibilityLabel={accessibilityLabel}
        size={Metrics.size.xl}
        backgroundColor={colors.primary}
        elevated
        onPress={onPress}
      >
        <Plus size={Metrics.icon.normal} color={colors.white} strokeWidth={Metrics.icon.strokeWidth} />
      </IconButton>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: Metrics.spacing.lg,
  },
});
