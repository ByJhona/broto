import { View, Text, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Metrics } from '@/theme';
import { useAuth, useCareTasks, useNotifications } from '@/hooks';
import { getGreeting } from '@/utils';
import { getDailyMessage, getProfile } from '@/services';
import { NotificationBell } from './NotificationBell';
import { ProfileIcon } from './ProfileIcon';
import { SkeletonBlock } from './Skeleton';

const FALLBACK_MESSAGE = 'Seu jardim está bem cuidado por você';

function getHighlightText(pendingCount: number): string {
  if (pendingCount === 0) return 'Suas plantas estão em dia hoje';
  const suffix = pendingCount > 1 ? 's' : '';
  return `Suas plantas pedem ${pendingCount} cuidado${suffix} hoje`;
}

export function HomeHeader() {
  const insets = useSafeAreaInsets();
  const { hasUnread } = useNotifications();
  const { pendingCount } = useCareTasks();
  const { user } = useAuth();

  const { data: profile = null } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => getProfile(user!.id),
    enabled: !!user?.id,
  });
  const [dailyMessage, setDailyMessage] = useState<string | null>(null);
  const [isLoadingMessage, setIsLoadingMessage] = useState(true);

  useEffect(() => {
    getDailyMessage()
      .then(setDailyMessage)
      .catch(() => setDailyMessage(FALLBACK_MESSAGE))
      .finally(() => setIsLoadingMessage(false));
  }, []);

  const firstName = profile?.name?.split(' ')[0] ?? user?.user_metadata?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'Jardineiro';
  const highlightText = getHighlightText(pendingCount);

  return (
    <View style={[styles.header, { paddingTop: insets.top + Metrics.spacing.xl }]}>
      <View style={styles.headerTop}>
        <Text style={styles.greeting}>{getGreeting()}, {firstName}</Text>
        <View style={styles.headerActions}>
          <NotificationBell hasUnread={hasUnread} />
          <ProfileIcon name={firstName} url={profile?.avatar_url} loggedIn={!!user} />
        </View>
      </View>

      {isLoadingMessage && (
        <SkeletonBlock height={42} width="80%" radius={Metrics.radius.md} style={styles.mainHighlightSkeleton} />
      )}
      {!isLoadingMessage && dailyMessage && <Text style={styles.mainHighlight}>{dailyMessage}</Text>}

      <Text style={styles.subText}>{highlightText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.leaf,
    paddingHorizontal: Metrics.spacing.lg,
    paddingBottom: 60,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Metrics.spacing.xl,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.md,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.leafForeground,
  },
  mainHighlight: {
    fontSize: 34,
    fontWeight: 'bold',
    color: Colors.white,
    lineHeight: 42,
    marginBottom: Metrics.spacing.md,
  },
  mainHighlightSkeleton: {
    marginBottom: Metrics.spacing.md,
  },
  subText: {
    fontSize: 16,
    color: Colors.leafForeground,
    opacity: 0.9,
    lineHeight: 24,
  },
});
