import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Coins from 'lucide-react-native/icons/coins';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { useAuth, useCredits, useNotifications } from '@/hooks';
import { getGreeting } from '@/utils';
import { getProfile } from '@/services';
import { ChatButton } from './ChatButton';
import { CreditsCard } from './CreditsCard';
import { NotificationBell } from './NotificationBell';
import { ProfileIcon } from './ProfileIcon';

const COLLAPSED_CONTENT_HEIGHT = 48;
const EXPANDED_CONTENT_HEIGHT = 190;
const COLLAPSED_RADIUS = 24;
const EXPANDED_RADIUS = 40;
const ANIMATION_DURATION = 260;

type HomeHeaderProps = {
  expanded: boolean;
  onExpand: () => void;
  onHeightChange?: (height: number) => void;
};

export function HomeHeader({ expanded, onExpand, onHeightChange }: Readonly<HomeHeaderProps>) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { hasUnread } = useNotifications();
  const { user } = useAuth();
  const { credits } = useCredits();

  const { data: profile = null } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => getProfile(user!.id),
    enabled: !!user?.id,
  });

  const [collapsedHeight, setCollapsedHeight] = useState(COLLAPSED_CONTENT_HEIGHT);
  const [expandedHeight, setExpandedHeight] = useState(EXPANDED_CONTENT_HEIGHT);

  const progress = useSharedValue(expanded ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, { duration: ANIMATION_DURATION, easing: Easing.out(Easing.cubic) });
  }, [expanded, progress]);

  useEffect(() => {
    onHeightChange?.(expanded ? expandedHeight : collapsedHeight);
  }, [expanded, expandedHeight, collapsedHeight, onHeightChange]);

  const containerStyle = useAnimatedStyle(() => {
    const radius = COLLAPSED_RADIUS + progress.value * (EXPANDED_RADIUS - COLLAPSED_RADIUS);
    return {
      height: collapsedHeight + progress.value * (expandedHeight - collapsedHeight),
      borderBottomLeftRadius: radius,
      borderBottomRightRadius: radius,
    };
  });

  const expandedContentStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const collapsedContentStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));

  const firstName =
    profile?.name?.split(' ')[0] ?? user?.user_metadata?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'Jardineiro';

  return (
    <Animated.View style={[styles.header, containerStyle]}>
      <Animated.View
        style={[styles.contentLayer, expandedContentStyle]}
        pointerEvents={expanded ? 'auto' : 'none'}
        onLayout={(event) => setExpandedHeight(event.nativeEvent.layout.height)}
      >
        <View style={{ paddingTop: insets.top + Metrics.spacing.md, paddingBottom: Metrics.spacing.lg }}>
          <View style={styles.headerTop}>
            <Text style={styles.greeting}>
              {getGreeting()}, {firstName}
            </Text>
            <View style={styles.headerActions}>
              <NotificationBell hasUnread={hasUnread} />
              <ChatButton />
              <ProfileIcon name={firstName} url={profile?.avatar_url} loggedIn={!!user} />
            </View>
          </View>

          <CreditsCard />
        </View>
      </Animated.View>

      <Animated.View
        style={[styles.contentLayer, collapsedContentStyle]}
        pointerEvents={expanded ? 'none' : 'auto'}
        onLayout={(event) => setCollapsedHeight(event.nativeEvent.layout.height)}
      >
        <Pressable
          style={[styles.collapsedRow, { paddingTop: insets.top + Metrics.spacing.md, paddingBottom: Metrics.spacing.sm }]}
          onPress={onExpand}
        >
          <Text style={styles.collapsedGreeting}>
            {getGreeting()}, {firstName}
          </Text>
          <View style={styles.collapsedActions}>
            <Pressable style={styles.creditsChip} onPress={() => router.push('/profile/plans')}>
              <Coins size={14} color={colors.leafForeground} strokeWidth={Metrics.icon.strokeWidth} />
              <Text style={styles.creditsChipText}>{credits?.balance ?? '—'}</Text>
            </Pressable>
            <NotificationBell hasUnread={hasUnread} />
            <ChatButton />
            <ProfileIcon name={firstName} url={profile?.avatar_url} loggedIn={!!user} />
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    header: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.leaf,
      overflow: 'hidden',
      zIndex: 1,
      elevation: 4,
    },
    contentLayer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      paddingHorizontal: Metrics.spacing.lg,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Metrics.spacing.md,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.md,
    },
    greeting: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.leafForeground,
    },
    collapsedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    collapsedGreeting: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.leafForeground,
    },
    collapsedActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.md,
    },
    creditsChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: `${colors.leafForeground}26`,
      borderRadius: Metrics.radius.full,
      paddingVertical: 4,
      paddingHorizontal: Metrics.spacing.sm,
    },
    creditsChipText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.leafForeground,
    },
  });
