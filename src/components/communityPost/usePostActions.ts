import { Share } from 'react-native';
import { createURL } from 'expo-linking';
import { useTranslation } from '@/i18n';
import { reportContent } from '@/services';
import {
  CONTENT_REPORT_REASONS,
  type CommunityComment,
  type CommunityPost,
  type ContentReportReason,
  type ContentReportTarget,
} from '@/types';
import { ActionSheet, type AlertButton, confirm, Toast } from '@/utils';

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
  const cancelButton: AlertButton = { text: t('common:cancel'), style: 'cancel' };
  const isOwn = (authorId: string) => !!currentUserId && currentUserId === authorId;

  const submitReport = async (target: ContentReportTarget, reason: ContentReportReason) => {
    try {
      await reportContent(target, reason);
      Toast.success(t('community:reportSuccess'));
    } catch (err) {
      console.error(err);
      Toast.error(t('community:reportError'));
    }
  };

  const openReportReasons = (target: ContentReportTarget) =>
    ActionSheet.show(t('community:reportReasonTitle'), [
      ...CONTENT_REPORT_REASONS.map((reason) => ({
        text: t(`community:reportReason.${reason}`),
        onPress: () => submitReport(target, reason),
      })),
      cancelButton,
    ]);

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
        {
          text: t('community:reportPostAction'),
          style: 'destructive',
          onPress: () => openReportReasons({ type: 'post', id: post.id }),
        },
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
        {
          text: t('community:reportCommentAction'),
          style: 'destructive',
          onPress: () => openReportReasons({ type: 'comment', id: comment.id }),
        },
        cancelButton,
      ]);
    }
  };

  return { openPostActions, openCommentActions };
}
