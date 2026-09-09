import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AlertCircle from 'lucide-react-native/icons/circle-alert';
import CheckCircle2 from 'lucide-react-native/icons/circle-check';
import Info from 'lucide-react-native/icons/info';
import type { LucideIcon } from 'lucide-react-native';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { registerToastHandler, type ToastType } from '@/utils';

function getToastMeta(colors: ThemeColors): Record<ToastType, { icon: LucideIcon; color: string }> {
  return {
    success: { icon: CheckCircle2, color: colors.leaf },
    error: { icon: AlertCircle, color: colors.destructive },
    info: { icon: Info, color: colors.primary },
  };
}

const VISIBLE_DURATION_MS = 2800;
const HIDDEN_OFFSET = -80;

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const toastMeta = useMemo(() => getToastMeta(colors), [colors]);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [translateY] = useState(() => new Animated.Value(HIDDEN_OFFSET));
  const [opacity] = useState(() => new Animated.Value(0));
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    registerToastHandler((message, type) => setToast({ message, type }));
    return () => registerToastHandler(null);
  }, []);

  useEffect(() => {
    if (!toast) return;

    if (hideTimeout.current) clearTimeout(hideTimeout.current);

    translateY.setValue(HIDDEN_OFFSET);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    hideTimeout.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: HIDDEN_OFFSET, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setToast(null));
    }, VISIBLE_DURATION_MS);

    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, [toast, translateY, opacity]);

  if (!toast) return null;

  const meta = toastMeta[toast.type];
  const Icon = meta.icon;

  return (
    <Animated.View
      style={[styles.container, { top: insets.top + Metrics.spacing.sm, opacity, transform: [{ translateY }] }]}
      pointerEvents="none"
    >
      <Icon size={Metrics.icon.normal} color={meta.color} strokeWidth={Metrics.icon.strokeWidth} />
      <Text style={styles.message}>{toast.message}</Text>
    </Animated.View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    position: 'absolute',
    left: Metrics.spacing.lg,
    right: Metrics.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.sm,
    backgroundColor: colors.card,
    borderRadius: Metrics.radius.lg,
    padding: Metrics.spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
  },
  });
