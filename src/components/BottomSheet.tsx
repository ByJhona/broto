import { useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Metrics, Motion, Opacity, Overlays, type ThemeColors, Typography, useThemedStyles } from '@/theme';
import { useTranslation } from '@/i18n';
import { useReduceMotion } from '@/hooks';

const CLOSE_DRAG_DISTANCE = 96;
const CLOSE_DRAG_VELOCITY = 1;

const ENTER_ANIMATION = {
  toValue: 1,
  duration: Motion.medium,
  easing: Easing.out(Easing.cubic),
  useNativeDriver: true,
};

const EXIT_ANIMATION = {
  toValue: 0,
  duration: Motion.fast,
  easing: Easing.in(Easing.cubic),
  useNativeDriver: true,
};

type BottomSheetProps = PropsWithChildren<{
  visible: boolean;
  title?: string;
  onClose: () => void;
  sheetStyle?: StyleProp<ViewStyle>;
}>;

function useSheetProgress(visible: boolean) {
  const [progress] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);

  if (visible && !isMounted) setIsMounted(true);

  useEffect(() => {
    Animated.timing(progress, visible ? ENTER_ANIMATION : EXIT_ANIMATION).start(({ finished }) => {
      if (finished && !visible) setIsMounted(false);
    });
  }, [visible, progress]);

  return { progress, isMounted };
}

function useDragToClose(visible: boolean, onClose: () => void) {
  const [dragY] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (visible) dragY.setValue(0);
  }, [visible, dragY]);

  const panResponder = useMemo(() => {
    const settle = () => Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_event, gesture) => dragY.setValue(Math.max(0, gesture.dy)),
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dy > CLOSE_DRAG_DISTANCE || gesture.vy > CLOSE_DRAG_VELOCITY) {
          onClose();
          return;
        }
        settle();
      },
      onPanResponderTerminate: settle,
    });
  }, [dragY, onClose]);

  return { dragY, panHandlers: panResponder.panHandlers };
}

export function BottomSheet({ visible, title, onClose, sheetStyle, children }: Readonly<BottomSheetProps>) {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const { progress, isMounted } = useSheetProgress(visible);
  const { dragY, panHandlers } = useDragToClose(visible, onClose);

  const enterY = progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
  const sheetMotion = reduceMotion
    ? { opacity: progress, transform: [{ translateY: dragY }] }
    : { transform: [{ translateY: Animated.add(enterY, dragY) }] };

  return (
    <Modal visible={isMounted} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: progress }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('close')}
        />
      </Animated.View>
      <KeyboardStickyView style={styles.container} pointerEvents="box-none">
        <Animated.View
          accessibilityViewIsModal
          style={[styles.sheet, { paddingBottom: insets.bottom + Metrics.spacing.lg }, sheetStyle, sheetMotion]}
        >
          <View style={styles.handleArea} {...panHandlers}>
            <View style={styles.handle} />
          </View>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {children}
        </Animated.View>
      </KeyboardStickyView>
    </Modal>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      backgroundColor: Overlays.scrim,
    },
    container: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: Metrics.radius.lg,
      borderTopRightRadius: Metrics.radius.lg,
      paddingHorizontal: Metrics.spacing.lg,
    },
    handleArea: {
      alignItems: 'center',
      paddingTop: Metrics.spacing.sm,
      paddingBottom: Metrics.spacing.md,
    },
    title: {
      ...Typography.title,
      color: colors.foreground,
      marginBottom: Metrics.spacing.md,
    },
    handle: {
      width: Metrics.size.md,
      height: Metrics.spacing.xs,
      borderRadius: Metrics.radius.full,
      backgroundColor: colors.mutedForeground,
      opacity: Opacity.faint,
    },
  });
