import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import Bell from 'lucide-react-native/icons/bell';
import Droplet from 'lucide-react-native/icons/droplet';
import Heart from 'lucide-react-native/icons/heart';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import Sprout from 'lucide-react-native/icons/sprout';
import Ticket from 'lucide-react-native/icons/ticket';
import Trophy from 'lucide-react-native/icons/trophy';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography, Opacity } from '@/theme';
import { useTranslation } from '@/i18n';
import type { Notification, NotificationType } from '@/types';
import { formatTimeAgo, notificationCopy } from '@/utils';
import { Avatar } from '../Avatar';
import { IconBadge } from '../IconBadge';
import { Thumbnail } from '../Thumbnail';

const TYPE_ICONS: Record<NotificationType, LucideIcon> = {
  system: Bell,
  like: Heart,
  comment: MessageCircle,
  listing_interest: Sprout,
  care_setup_reminder: Droplet,
  care_reminder: Droplet,
  promo_winner: Trophy,
  promo_result: Ticket,
};

function typeColor(type: NotificationType, colors: ThemeColors): string {
  if (type === 'like' || type === 'promo_winner') return colors.primary;
  if (type === 'listing_interest') return colors.accent;
  return colors.leaf;
}

function NotificationLeading({ notification }: Readonly<{ notification: Notification }>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const Icon = TYPE_ICONS[notification.type] ?? Bell;
  const color = typeColor(notification.type, colors);

  if (!notification.actorId) {
    return (
      <IconBadge size={Metrics.size.lg} backgroundColor={`${color}1F`}>
        <Icon size={Metrics.icon.normal} color={color} strokeWidth={Metrics.icon.stroke.regular} />
      </IconBadge>
    );
  }

  return (
    <View>
      <Avatar name={notification.actorName ?? ''} url={notification.actorAvatarUrl} size={Metrics.size.lg} />
      <IconBadge size={Metrics.size.xs} backgroundColor={color} style={styles.typeBadge}>
        <Icon size={Metrics.icon.xs} color={colors.white} strokeWidth={Metrics.icon.stroke.regular} />
      </IconBadge>
    </View>
  );
}

type NotificationRowProps = {
  notification: Notification;
  onPress?: () => void;
  onDelete: () => void;
};

export function NotificationRow({ notification, onPress, onDelete }: Readonly<NotificationRowProps>) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('notifications');
  const copy = notificationCopy(notification);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onPress}
      onLongPress={onDelete}
      accessibilityRole="button"
      accessibilityActions={[{ name: 'delete', label: t('deleteAction') }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'delete') onDelete();
      }}
    >
      <NotificationLeading notification={notification} />
      <View style={styles.body}>
        <Text style={styles.text} numberOfLines={3}>
          {copy.actor ? (
            <>
              <Text style={styles.strong}>{copy.actor}</Text> {copy.text}
            </>
          ) : (
            <Text style={styles.strong}>{copy.text}</Text>
          )}
        </Text>
        {copy.detail ? (
          <Text style={styles.detail} numberOfLines={2}>
            {copy.detail}
          </Text>
        ) : null}
        <Text style={styles.time}>{formatTimeAgo(notification.createdAt)}</Text>
      </View>
      {notification.previewPhotoUrl ? <Thumbnail photoUrl={notification.previewPhotoUrl} /> : null}
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Metrics.spacing.md,
      paddingVertical: Metrics.spacing.md,
    },
    pressed: {
      opacity: Opacity.pressed,
    },
    typeBadge: {
      position: 'absolute',
      right: -Metrics.spacing.xs,
      bottom: -Metrics.spacing.xs,
      borderWidth: Metrics.borderWidth.lg,
      borderColor: colors.card,
    },
    body: {
      flex: 1,
      gap: Metrics.spacing.xs,
    },
    text: {
      ...Typography.bodySmall,
      color: colors.foreground,
    },
    strong: {
      ...Typography.labelStrong,
      color: colors.foreground,
    },
    detail: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
    },
    time: {
      ...Typography.caption,
      color: colors.mutedForeground,
    },
  });
