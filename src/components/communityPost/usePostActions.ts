import { Share } from 'react-native';
import { createURL } from 'expo-linking';
import { useModerationActions } from '@/hooks';
import { useTranslation } from '@/i18n';
import type { CommunityComment, CommunityPost } from '@/types';
import { ActionSheet, confirm } from '@/utils';

export type PostActionsHandlers = {
  onDelete?: (postId: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onBoost?: (postId: string) => void;
};

export function usePostActions(
  post: CommunityPost,
  currentUserId: string | null | undefined,
  { onDelete, onDeleteComment, onBoost }: PostActionsHandlers
) {
  const { t } = useTranslation(['community', 'common']);
  const { cancelButton, reportButton, blockButton } = useModerationActions();
  const isOwn = (authorId: string) => !!currentUserId && currentUserId === authorId;

  const sharePost = () => {
    const invite = t('community:sharePostMessage', { author: post.authorName, link: createURL(`post/${post.id}`) });
    return Share.share({ message: post.caption ? `${post.caption}\n\n${invite}` : invite });
  };

  const confirmDeletePost = async () => {
    const confirmed = await confirm(t('community:deletePostTitle'), t('community:deletePostMessage'), {
      confirmLabel: t('common:delete'),
      destructive: true,
    });
    if (confirmed) onDelete?.(post.id);
  };

  const confirmDeleteComment = async (commentId: string) => {
    const confirmed = await confirm(t('community:deleteCommentTitle'), t('community:deleteCommentMessage'), {
      confirmLabel: t('common:delete'),
      destructive: true,
    });
    if (confirmed) onDeleteComment?.(commentId);
  };

  const openPostActions = () => {
    if (isOwn(post.authorId)) {
      ActionSheet.show(t('community:postActionsTitle'), [
        { text: t('community:boostPostAction'), onPress: () => onBoost?.(post.id) },
        { text: t('community:sharePostAction'), onPress: sharePost },
        { text: t('common:delete'), style: 'destructive', onPress: confirmDeletePost },
        cancelButton,
      ]);
    } else {
      ActionSheet.show(t('community:otherPostActionsTitle', { name: post.authorName }), [
        { text: t('community:sharePostAction'), onPress: sharePost },
        reportButton({ type: 'post', id: post.id }, t('community:reportPostAction')),
        blockButton({ id: post.authorId, name: post.authorName }),
        cancelButton,
      ]);
    }
  };

  const openCommentActions = (comment: CommunityComment) => {
    if (isOwn(comment.authorId)) {
      ActionSheet.show(t('community:commentActionsTitle'), [
        { text: t('common:delete'), style: 'destructive', onPress: () => confirmDeleteComment(comment.id) },
        cancelButton,
      ]);
    } else {
      ActionSheet.show(t('community:otherCommentActionsTitle', { name: comment.authorName }), [
        reportButton({ type: 'comment', id: comment.id }, t('community:reportCommentAction')),
        blockButton({ id: comment.authorId, name: comment.authorName }),
        cancelButton,
      ]);
    }
  };

  return { openPostActions, openCommentActions };
}
