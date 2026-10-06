import { memo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import Camera from 'lucide-react-native/icons/camera';
import MoreVertical from 'lucide-react-native/icons/ellipsis-vertical';
import { Metrics, useColors, useThemedStyles } from '@/theme';
import { useTranslation } from '@/i18n';
import { type CommunityComment } from '@/types';
import { pickPhoto } from '@/utils';
import { AttachmentPreview } from '../AttachmentPreview';
import { Avatar } from '../Avatar';
import { SendButton } from '../SendButton';
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
        <MoreVertical size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.stroke.regular} />
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
        <AttachmentPreview uri={attachedPhotoUri} onRemove={() => setAttachedPhotoUri(null)} style={styles.attachmentPreview} />
      ) : null}

      <View style={styles.commentInputRow}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common:addPhoto')} style={styles.commentPhotoButton} onPress={handlePickPhoto} disabled={isSending}>
          <Camera size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.stroke.regular} />
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
        <SendButton loading={isSending} disabled={!draft.trim() && !attachedPhotoUri} onPress={handleSend} />
      </View>
    </View>
  );
});
