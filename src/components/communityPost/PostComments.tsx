import { memo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import Camera from 'lucide-react-native/icons/camera';
import MoreVertical from 'lucide-react-native/icons/ellipsis-vertical';
import Send from 'lucide-react-native/icons/send';
import X from 'lucide-react-native/icons/x';
import { Metrics, useColors, useThemedStyles } from '@/theme';
import { useTranslation } from '@/i18n';
import { type CommunityComment } from '@/types';
import { pickPhoto } from '@/utils';
import { Avatar } from '../Avatar';
import { makeStyles } from './styles';

type CommentRowProps = {
  comment: CommunityComment;
  onOpenActions: () => void;
};

function CommentRow({ comment, onOpenActions }: Readonly<CommentRowProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('common');
  return (
    <View style={styles.comment}>
      <Avatar name={comment.authorName} url={comment.authorAvatarUrl} size={Metrics.size.sm} />
      <View style={styles.commentBody}>
        <Text style={styles.commentAuthor}>
          {comment.authorName} <Text style={styles.commentTime}>· {comment.createdAt}</Text>
        </Text>
        {comment.photoUrl ? <Image source={{ uri: comment.photoUrl }} style={styles.commentPhoto} contentFit="cover" /> : null}
        {comment.text ? <Text style={styles.commentText}>{comment.text}</Text> : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('a11yMoreOptions')}
        style={styles.commentMenuButton}
        onPress={onOpenActions}
        hitSlop={Metrics.spacing.sm}
      >
        <MoreVertical size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
      </Pressable>
    </View>
  );
}

type PostCommentsProps = {
  postId: string;
  comments: CommunityComment[];
  onOpenCommentActions: (comment: CommunityComment) => void;
  onAddComment: (postId: string, text: string, photoUri?: string) => Promise<void>;
};

export const PostComments = memo(function PostComments({
  postId,
  comments,
  onOpenCommentActions,
  onAddComment,
}: Readonly<PostCommentsProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('community');
  const [draft, setDraft] = useState('');
  const [attachedPhotoUri, setAttachedPhotoUri] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const handlePickPhoto = async () => {
    const photoUri = await pickPhoto(t('community:sendPhotoAction'));
    if (!photoUri) return;
    setAttachedPhotoUri(photoUri);
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text && !attachedPhotoUri) return;
    if (isSending) return;
    setIsSending(true);
    try {
      await onAddComment(postId, text, attachedPhotoUri ?? undefined);
      setDraft('');
      setAttachedPhotoUri(null);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View style={styles.comments}>
      {comments.map((comment) => (
        <CommentRow key={comment.id} comment={comment} onOpenActions={() => onOpenCommentActions(comment)} />
      ))}

      {attachedPhotoUri ? (
        <View style={styles.attachmentPreviewWrapper}>
          <Image source={{ uri: attachedPhotoUri }} style={styles.attachmentPreview} contentFit="cover" />
          <Pressable accessibilityRole="button" accessibilityLabel={t('common:a11yRemovePhoto')} style={styles.attachmentRemoveButton} onPress={() => setAttachedPhotoUri(null)} hitSlop={Metrics.spacing.sm}>
            <X size={Metrics.icon.xs} color={colors.white} strokeWidth={Metrics.icon.strokeWidth} />
          </Pressable>
        </View>
      ) : null}

      <View style={styles.commentInputRow}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common:addPhoto')} style={styles.commentPhotoButton} onPress={handlePickPhoto} disabled={isSending}>
          <Camera size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
        </Pressable>
        <TextInput
          style={[styles.commentInput, isSending && styles.commentInputDisabled]}
          value={draft}
          onChangeText={setDraft}
          placeholder={t('commentPlaceholder')}
          placeholderTextColor={colors.mutedForeground}
          onSubmitEditing={handleSend}
          editable={!isSending}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common:a11ySend')}
          style={[styles.commentSend, (isSending || (!draft.trim() && !attachedPhotoUri)) && styles.commentSendDisabled]}
          onPress={handleSend}
          disabled={isSending || (!draft.trim() && !attachedPhotoUri)}
        >
          {isSending ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Send size={Metrics.icon.small} color={colors.primaryForeground} strokeWidth={Metrics.icon.strokeWidth} />
          )}
        </Pressable>
      </View>
    </View>
  );
});
