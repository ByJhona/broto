import { Pressable, Text, View } from 'react-native';
import { Metrics, useThemedStyles } from '@/theme';
import { useTranslation } from '@/i18n';
import type { CommunityComment } from '@/types';
import { makeStyles } from './styles';

type PostCommentPreviewProps = {
  comments: CommunityComment[];
  onOpen: () => void;
};

export function PostCommentPreview({ comments, onOpen }: Readonly<PostCommentPreviewProps>) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('community');
  const latest = comments.at(-1);
  if (!latest) return null;

  return (
    <View style={styles.preview}>
      <Text style={styles.previewText} numberOfLines={2}>
        <Text style={styles.previewAuthor}>{latest.authorName} </Text>
        {latest.text ?? t('photoCommentLabel')}
      </Text>
      <Pressable onPress={onOpen} hitSlop={Metrics.spacing.sm} accessibilityRole="button">
        <Text style={styles.previewLink}>
          {comments.length === 1 ? t('viewOneComment') : t('viewComments', { count: comments.length })}
        </Text>
      </Pressable>
    </View>
  );
}
