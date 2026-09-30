import { useState } from 'react';
import { RefreshControl, ScrollView, View, Text, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Metrics, type ThemeColors, useColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { useAuth, useConversations, useCredits, useNotifications } from '@/hooks';
import { getGreeting } from '@/utils';
import { getProfile } from '@/services';
import { ChatButton } from './ChatButton';
import { CreditsBar } from './CreditsBar';
import { NotificationBell } from './NotificationBell';
import { ProfileIcon } from './ProfileIcon';

type HomeHeaderProps = {
  onLayout?: (event: LayoutChangeEvent) => void;
  onRefresh?: () => Promise<unknown>;
};

export function HomeHeader({ onLayout, onRefresh }: Readonly<HomeHeaderProps>) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('profile');
  const { hasUnread } = useNotifications();
  const { hasUnread: hasUnreadMessages } = useConversations();
  const { user } = useAuth();
  const { refresh: refreshCredits } = useCredits();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: profile = null, refetch: refetchProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => getProfile(user!.id),
    enabled: !!user?.id,
  });

  const firstName =
    profile?.name?.split(' ')[0] ?? user?.user_metadata?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? t('defaultGardenerName');

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([onRefresh?.(), refetchProfile(), refreshCredits()]);
    setIsRefreshing(false);
  };

  return (
    <View style={styles.header} onLayout={onLayout}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Metrics.spacing.md }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            progressViewOffset={insets.top}
            tintColor={colors.leafForeground}
            colors={[colors.leaf]}
          />
        }
      >
        <View style={styles.headerTop}>
          <View style={styles.greetingBlock}>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.name} numberOfLines={2}>
              {firstName}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <NotificationBell hasUnread={hasUnread} />
            <ChatButton hasUnread={hasUnreadMessages} />
            <ProfileIcon name={firstName} url={profile?.avatar_url} loggedIn={!!user} />
          </View>
        </View>

        <CreditsBar />
      </ScrollView>
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
      borderBottomLeftRadius: Metrics.radius.xl,
      borderBottomRightRadius: Metrics.radius.xl,
      zIndex: 1,
      elevation: 4,
    },
    scroll: {
      flexGrow: 0,
    },
    content: {
      paddingHorizontal: Metrics.spacing.lg,
      paddingBottom: Metrics.spacing.lg,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: Metrics.spacing.md,
      marginBottom: Metrics.spacing.md,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.md,
    },
    greetingBlock: {
      flex: 1,
    },
    greeting: {
      ...Typography.label,
      color: colors.leafForeground,
      opacity: 0.85,
    },
    name: {
      ...Typography.title,
      color: colors.leafForeground,
    },
  });
