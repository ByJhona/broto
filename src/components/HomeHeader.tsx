import { View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { useTranslation } from '@/i18n';
import { useAuth, useConversations, useNotifications } from '@/hooks';
import { getGreeting } from '@/utils';
import { getProfile } from '@/services';
import { ChatButton } from './ChatButton';
import { CreditsCard } from './CreditsCard';
import { NotificationBell } from './NotificationBell';
import { ProfileIcon } from './ProfileIcon';

const HEADER_RADIUS = 40;

export function HomeHeader() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation('profile');
  const { hasUnread } = useNotifications();
  const { hasUnread: hasUnreadMessages } = useConversations();
  const { user } = useAuth();

  const { data: profile = null } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => getProfile(user!.id),
    enabled: !!user?.id,
  });

  const firstName =
    profile?.name?.split(' ')[0] ?? user?.user_metadata?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? t('defaultGardenerName');

  return (
    <View style={[styles.header, { paddingTop: insets.top + Metrics.spacing.md }]}>
      <View style={styles.headerTop}>
        <Text style={styles.greeting}>
          {getGreeting()}, {firstName}
        </Text>
        <View style={styles.headerActions}>
          <NotificationBell hasUnread={hasUnread} />
          <ChatButton hasUnread={hasUnreadMessages} />
          <ProfileIcon name={firstName} url={profile?.avatar_url} loggedIn={!!user} />
        </View>
      </View>

      <CreditsCard />
    </View>
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
      borderBottomLeftRadius: HEADER_RADIUS,
      borderBottomRightRadius: HEADER_RADIUS,
      paddingHorizontal: Metrics.spacing.lg,
      paddingBottom: Metrics.spacing.lg,
      zIndex: 1,
      elevation: 4,
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
  });
