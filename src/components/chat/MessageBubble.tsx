import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import CircleAlert from 'lucide-react-native/icons/circle-alert';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { MESSAGE_DELIVERY, type ChatMessage, type MessageDelivery } from '@/types';
import { formatTime } from '@/utils';

type MessageBubbleProps = {
  message: ChatMessage;
  delivery: MessageDelivery | null;
  isMine: boolean;
  startsGroup: boolean;
  endsGroup: boolean;
  onPressPhoto: (photoUrl: string) => void;
  onPressFailed: (messageId: string) => void;
};

function bubbleCorners(isMine: boolean, startsGroup: boolean, endsGroup: boolean) {
  const top = startsGroup ? Metrics.radius.lg : Metrics.radius.md;
  const bottom = endsGroup ? Metrics.radius.sm : Metrics.radius.md;
  return isMine
    ? { borderTopRightRadius: top, borderBottomRightRadius: bottom }
    : { borderTopLeftRadius: top, borderBottomLeftRadius: bottom };
}

type MessageMetaProps = {
  createdAt: string;
  delivery: MessageDelivery | null;
  isMine: boolean;
};

function MessageMeta({ createdAt, delivery, isMine }: Readonly<MessageMetaProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('chat');

  if (delivery === MESSAGE_DELIVERY.FAILED) {
    return (
      <View style={[styles.meta, styles.metaMine]}>
        <CircleAlert size={Metrics.icon.xs} color={colors.destructive} strokeWidth={Metrics.icon.strokeWidth} />
        <Text style={[styles.metaText, styles.metaFailed]}>{t('messageFailed')}</Text>
      </View>
    );
  }

  const label = delivery === MESSAGE_DELIVERY.SENDING ? t('messageSending') : formatTime(new Date(createdAt));
  return (
    <View style={[styles.meta, isMine && styles.metaMine]}>
      <Text style={styles.metaText}>{label}</Text>
    </View>
  );
}

export function MessageBubble({ message, delivery, isMine, startsGroup, endsGroup, onPressPhoto, onPressFailed }: Readonly<MessageBubbleProps>) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('common');
  const { photoUrl, body } = message;
  const isFailed = delivery === MESSAGE_DELIVERY.FAILED;
  const showMeta = endsGroup || delivery !== null;

  return (
    <View style={[styles.row, isMine && styles.rowMine, startsGroup && styles.rowGroupStart]}>
      <Pressable
        style={[
          styles.bubble,
          isMine ? styles.bubbleMine : styles.bubbleTheirs,
          bubbleCorners(isMine, startsGroup, endsGroup),
          delivery !== null && styles.bubblePending,
        ]}
        onPress={() => onPressFailed(message.id)}
        disabled={!isFailed}
      >
        {photoUrl ? (
          <Pressable
            accessibilityRole="imagebutton"
            accessibilityLabel={t('a11yViewPhoto')}
            onPress={() => onPressPhoto(photoUrl)}
            disabled={delivery !== null}
          >
            <Image source={{ uri: photoUrl }} style={styles.photo} contentFit="cover" transition={200} />
          </Pressable>
        ) : null}
        {body ? <Text style={[styles.text, isMine && styles.textMine]}>{body}</Text> : null}
      </Pressable>
      {showMeta ? <MessageMeta createdAt={message.createdAt} delivery={delivery} isMine={isMine} /> : null}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      alignItems: 'flex-start',
      marginTop: Metrics.spacing.xs,
    },
    rowMine: {
      alignItems: 'flex-end',
    },
    rowGroupStart: {
      marginTop: Metrics.spacing.md,
    },
    bubble: {
      maxWidth: '75%',
      borderRadius: Metrics.radius.lg,
      overflow: 'hidden',
    },
    bubbleTheirs: {
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    bubbleMine: {
      backgroundColor: colors.primary,
    },
    bubblePending: {
      opacity: 0.7,
    },
    photo: {
      width: Metrics.media.md,
      aspectRatio: Metrics.aspect.portrait,
      backgroundColor: colors.muted,
    },
    text: {
      ...Typography.body,
      color: colors.foreground,
      paddingVertical: Metrics.spacing.sm,
      paddingHorizontal: Metrics.spacing.md,
    },
    textMine: {
      color: colors.primaryForeground,
    },
    meta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.xs,
      marginTop: Metrics.spacing.xs,
      paddingHorizontal: Metrics.spacing.xs,
    },
    metaMine: {
      justifyContent: 'flex-end',
    },
    metaText: {
      ...Typography.caption,
      color: colors.mutedForeground,
    },
    metaFailed: {
      color: colors.destructive,
    },
  });
