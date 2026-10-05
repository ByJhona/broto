import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Flame from 'lucide-react-native/icons/flame';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { useCareStreak, useReduceMotion } from '@/hooks';

type Translate = (key: string, options?: Record<string, unknown>) => string;

function useStreakPulse(current: number, isLoaded: boolean) {
  const reduceMotion = useReduceMotion();
  const [scale] = useState(() => new Animated.Value(1));
  const previous = useRef<number | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    const increased = previous.current !== null && current > previous.current;
    previous.current = current;
    if (!increased || reduceMotion) return;

    Animated.sequence([
      Animated.spring(scale, { toValue: 1.3, speed: 40, bounciness: 12, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, speed: 20, bounciness: 8, useNativeDriver: true }),
    ]).start();
  }, [current, isLoaded, reduceMotion, scale]);

  return scale;
}

function badgeLabel(current: number, t: Translate): string {
  if (current === 0) return t('careStreakBadgeEmpty');
  if (current === 1) return t('careStreakBadgeOne');
  return t('careStreakBadge', { count: current });
}

function streakTitle(current: number, t: Translate): string {
  if (current === 0) return t('careStreakEmptyTitle');
  if (current === 1) return t('careStreakTitleOne');
  return t('careStreakTitle', { count: current });
}

function streakSubtitle(current: number, longest: number, t: Translate): string {
  if (current === 0) return t('careStreakEmptySubtitle');
  if (longest > current) return t('careStreakRecordSubtitle', { count: longest });
  return t('careStreakNewRecordSubtitle');
}

export function CareStreakBadge() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('garden');
  const { current, longest, isLoaded } = useCareStreak();
  const scale = useStreakPulse(current, isLoaded);
  const isActive = current > 0;
  const iconColor = isActive ? colors.primaryForeground : colors.mutedForeground;

  return (
    <View
      style={[styles.badge, isActive && styles.badgeActive]}
      accessible
      accessibilityLabel={`${streakTitle(current, t)}. ${streakSubtitle(current, longest, t)}`}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Flame
          size={Metrics.chip.md.iconSize}
          color={iconColor}
          fill={isActive ? iconColor : 'none'}
          strokeWidth={Metrics.icon.stroke.regular}
        />
      </Animated.View>
      <Text style={[styles.label, isActive && styles.labelActive]}>{badgeLabel(current, t)}</Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.chip.md.gap,
      backgroundColor: colors.muted,
      borderRadius: Metrics.radius.full,
      paddingVertical: Metrics.chip.md.paddingVertical,
      paddingHorizontal: Metrics.chip.md.paddingHorizontal,
    },
    badgeActive: {
      backgroundColor: colors.primary,
    },
    label: {
      ...Typography.labelStrong,
      color: colors.mutedForeground,
    },
    labelActive: {
      color: colors.primaryForeground,
    },
  });
