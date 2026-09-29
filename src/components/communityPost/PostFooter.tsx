import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Heart from 'lucide-react-native/icons/heart';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import { Metrics, useColors, useThemedStyles } from '@/theme';
import { useTranslation } from '@/i18n';
import { makeStyles } from './styles';

type PostFooterProps = {
  liked: boolean;
  likeCount: number;
  commentCount: number;
  onToggleLike: () => void;
  onPressComments?: () => void;
};

export function PostFooter({ liked, likeCount, commentCount, onToggleLike, onPressComments }: Readonly<PostFooterProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('community');

  const handleToggleLike = () => {
    if (!liked) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleLike();
  };

  return (
    <View style={styles.footer}>
      <Pressable
        style={styles.footerButton}
        onPress={handleToggleLike}
        hitSlop={Metrics.spacing.sm}
        accessibilityRole="button"
        accessibilityState={{ selected: liked }}
        accessibilityLabel={t('likesLabel', { count: likeCount })}
      >
        <Heart
          size={Metrics.icon.normal}
          color={liked ? colors.primary : colors.mutedForeground}
          fill={liked ? colors.primary : 'none'}
          strokeWidth={Metrics.icon.strokeWidth}
        />
        <Text style={[styles.footerText, liked && styles.footerTextActive]}>{likeCount}</Text>
      </Pressable>

      <Pressable
        style={styles.footerButton}
        onPress={onPressComments}
        disabled={!onPressComments}
        hitSlop={Metrics.spacing.sm}
        accessibilityRole="button"
        accessibilityLabel={t('footerCommentsLabel', { count: commentCount })}
      >
        <MessageCircle size={Metrics.icon.normal} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
        <Text style={styles.footerText}>{commentCount}</Text>
      </Pressable>
    </View>
  );
}
