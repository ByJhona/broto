import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import BellOff from 'lucide-react-native/icons/bell-off';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import {
  CardGroup,
  EmptyState,
  FloatingScreenControls,
  InfoSection,
  PageTitle,
  SkeletonBlock,
  useScreenTopInset,
} from '@/components';
import { NotificationRow } from '@/components/notifications/NotificationRow';
import { useNotifications } from '@/hooks';
import { notificationHref } from '@/services';
import type { Notification } from '@/types';
import {
  ActionSheet,
  confirm,
  groupNotificationsBySection,
  NOTIFICATION_SECTION,
  type NotificationSection,
  type NotificationSectionKey,
} from '@/utils';

const SECTION_TITLE_KEYS: Record<NotificationSectionKey, string> = {
  [NOTIFICATION_SECTION.TODAY]: 'notifications:sectionToday',
  [NOTIFICATION_SECTION.THIS_WEEK]: 'notifications:sectionThisWeek',
  [NOTIFICATION_SECTION.EARLIER]: 'notifications:sectionEarlier',
};

const SKELETON_ROWS = ['a', 'b', 'c', 'd'];

function NotificationsSkeleton() {
  const styles = useThemedStyles(makeStyles);
  return (
    <CardGroup>
      {SKELETON_ROWS.map((key) => (
        <View key={key} style={styles.skeletonRow}>
          <SkeletonBlock width={Metrics.size.lg} height={Metrics.size.lg} radius={Metrics.radius.full} />
          <View style={styles.skeletonText}>
            <SkeletonBlock width="80%" />
            <SkeletonBlock width="30%" height={Metrics.fontSize.caption} />
          </View>
        </View>
      ))}
    </CardGroup>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = useScreenTopInset();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation(['profile', 'notifications', 'common']);
  const { notifications, isLoading, deleteOne, clearAll } = useNotifications();
  const sections = groupNotificationsBySection(notifications);
  const hasNotifications = notifications.length > 0;

  const handleClearAll = async () => {
    const confirmed = await confirm(t('clearNotificationsTitle'), t('clearNotificationsMessage'), {
      confirmLabel: t('clearAll'),
      destructive: true,
    });
    if (confirmed) clearAll();
  };

  const handleOpenActions = () => {
    ActionSheet.show(t('notificationsTitle'), [
      { text: t('clearAll'), style: 'destructive', onPress: handleClearAll },
      { text: t('common:cancel'), style: 'cancel' },
    ]);
  };

  const handleDelete = (notification: Notification) => {
    ActionSheet.show(t('notifications:deleteAction'), [
      { text: t('common:delete'), style: 'destructive', onPress: () => deleteOne(notification.id) },
      { text: t('common:cancel'), style: 'cancel' },
    ]);
  };

  const handleOpen = (notification: Notification) => {
    const href = notificationHref(notification);
    return href ? () => router.push(href) : undefined;
  };

  const header = (
    <View style={styles.header}>
      <PageTitle>{t('notificationsTitle')}</PageTitle>
      {hasNotifications ? (
        <Text style={styles.subtitle}>{t('notifications:countSubtitle', { count: notifications.length })}</Text>
      ) : null}
    </View>
  );

  const renderSection = ({ item }: { item: NotificationSection }) => (
    <InfoSection title={t(SECTION_TITLE_KEYS[item.key])}>
      <CardGroup>
        {item.notifications.map((notification) => (
          <NotificationRow
            key={notification.id}
            notification={notification}
            onPress={handleOpen(notification)}
            onDelete={() => handleDelete(notification)}
          />
        ))}
      </CardGroup>
    </InfoSection>
  );

  const renderEmpty = () =>
    isLoading ? (
      <NotificationsSkeleton />
    ) : (
      <EmptyState icon={BellOff} title={t('noNotificationsTitle')} message={t('noNotificationsMessage')} style={styles.empty} />
    );

  return (
    <View style={styles.container}>
      <FlatList
        data={sections}
        keyExtractor={(section) => section.key}
        renderItem={renderSection}
        ListHeaderComponent={header}
        ListEmptyComponent={renderEmpty()}
        ListFooterComponent={hasNotifications ? <Text style={styles.hint}>{t('notifications:longPressHint')}</Text> : null}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topInset,
            paddingBottom: insets.bottom + Metrics.spacing.xl,
          },
        ]}
      />
      <FloatingScreenControls onOpenActions={hasNotifications ? handleOpenActions : undefined} />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      ...Metrics.layout.centeredContent,
      flexGrow: 1,
      paddingHorizontal: Metrics.spacing.lg,
    },
    header: {
      gap: Metrics.spacing.xs,
      marginBottom: Metrics.spacing.xl,
    },
    subtitle: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
    },
    empty: {
      flex: 1,
      justifyContent: 'center',
    },
    hint: {
      ...Typography.caption,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
    skeletonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.md,
      paddingVertical: Metrics.spacing.md,
    },
    skeletonText: {
      flex: 1,
      gap: Metrics.spacing.sm,
    },
  });
