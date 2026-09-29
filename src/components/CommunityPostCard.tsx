import { memo } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import ImageIcon from 'lucide-react-native/icons/image';
import { useThemedStyles } from '@/theme';
import { type CommunityPost } from '@/types';
import { ExpandableText } from './ExpandableText';
import { PhotoPager } from './PhotoPager';
import { makeStyles } from './communityPost/styles';
import { PostCommentPreview } from './communityPost/PostCommentPreview';
import { PostComments } from './communityPost/PostComments';
import { PostFooter } from './communityPost/PostFooter';
import { PostHeader } from './communityPost/PostHeader';
import { PostLinkedPreviews } from './communityPost/PostLinkedPreviews';
import { type PostActionsHandlers, usePostActions } from './communityPost/usePostActions';

const CAPTION_PREVIEW_LINES = 4;

type CommunityPostCardProps = PostActionsHandlers & {
  post: CommunityPost;
  variant?: 'feed' | 'detail';
  currentUserId?: string | null;
  onToggleLike: (postId: string) => void;
  onAddComment?: (postId: string, text: string, photoUri?: string) => Promise<void>;
  onPressAuthor?: (authorId: string) => void;
  onPressListing?: (listingId: string) => void;
  onPressEvent?: (eventId: string) => void;
};

export const CommunityPostCard = memo(function CommunityPostCard({
  post,
  variant = 'feed',
  currentUserId,
  onToggleLike,
  onAddComment,
  onPressAuthor,
  onPressListing,
  onPressEvent,
  onDelete,
  onDeleteComment,
  onBoost,
}: Readonly<CommunityPostCardProps>) {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const actions = usePostActions(post, currentUserId, { onDelete, onDeleteComment, onBoost });
  const isDetail = variant === 'detail';
  const openPost = () => router.push({ pathname: '/post/[id]', params: { id: post.id } });

  return (
    <View style={styles.card}>
      <PostHeader post={post} onOpenActions={actions.openPostActions} onPressAuthor={onPressAuthor} />

      {post.imageUrls.length > 0 ? (
        <PhotoPager photoUrls={post.imageUrls} placeholderIcon={ImageIcon} recyclingKey={post.id} />
      ) : null}

      <View style={styles.body}>
        {post.caption && isDetail ? <Text style={styles.caption}>{post.caption}</Text> : null}
        {post.caption && !isDetail ? (
          <ExpandableText text={post.caption} numberOfLines={CAPTION_PREVIEW_LINES} style={styles.caption} />
        ) : null}

        <PostLinkedPreviews
          listing={post.listingSummary}
          event={post.eventSummary}
          onPressListing={onPressListing}
          onPressEvent={onPressEvent}
        />

        <PostFooter
          liked={post.liked}
          likeCount={post.likeCount}
          commentCount={post.comments.length}
          onToggleLike={() => onToggleLike(post.id)}
          onPressComments={isDetail ? undefined : openPost}
        />

        {isDetail && onAddComment ? (
          <PostComments
            postId={post.id}
            comments={post.comments}
            onOpenCommentActions={actions.openCommentActions}
            onAddComment={onAddComment}
          />
        ) : null}
        {isDetail ? null : <PostCommentPreview comments={post.comments} onOpen={openPost} />}
      </View>
    </View>
  );
});
