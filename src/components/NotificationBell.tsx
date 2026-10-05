import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import Bell from 'lucide-react-native/icons/bell';
import { Metrics, useColors, type ThemeColors, useThemedStyles } from '@/theme';
import { useTranslation } from '@/i18n';

type NotificationBellProps = {
  hasUnread?: boolean;
  size?: number;
  style?: ViewStyle;
};

export function NotificationBell({ hasUnread = false, size = Metrics.icon.normal, style }: Readonly<NotificationBellProps>) {
  const router = useRouter();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('profile');

  return (
    <Pressable
      onPress={() => router.push('/profile/notifications')}
      hitSlop={Metrics.hitSlop}
      accessibilityRole="button"
      accessibilityLabel={hasUnread ? t('notificationsUnreadLabel') : t('notificationsLabel')}
      style={({ pressed }) => [styles.container, { opacity: pressed ? 0.7 : 1 }, style]}
    >
      <Bell size={size} color={colors.leafForeground} strokeWidth={Metrics.icon.stroke.regular} />
      {hasUnread && <View style={styles.badge} />}
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    badge: {
      position: 'absolute',
      top: -Metrics.spacing.xs,
      right: -Metrics.spacing.xs,
      width: Metrics.size.dot,
      height: Metrics.size.dot,
      borderRadius: Metrics.radius.full,
      backgroundColor: colors.primary,
      borderWidth: Metrics.borderWidth.md,
      borderColor: colors.leafForeground,
    },
  });
