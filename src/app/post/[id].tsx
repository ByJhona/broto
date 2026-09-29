import { RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import MessageSquare from 'lucide-react-native/icons/message-square';
import { Metrics, useColors, type ThemeColors, useThemedStyles } from '@/theme';
import { CommunityPostCard, EmptyState, FloatingScreenControls, PostCardSkeleton, useScreenTopInset } from '@/components';
import { celebrateXpLevelUp, useAuth } from '@/hooks';
import {
  addComment,
  applyPostUpdateEverywhere,
  deleteComment,
  deletePost,
  getPostById,
  removePostEverywhere,
  toggleLike,
  type CommunityPostsQueryData,
} from '@/services';
import type { CommunityPost } from '@/types';
import { Toast } from '@/utils';
import { useTranslation } from '@/i18n';

const POST_STALE_TIME = 30_000;

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = useScreenTopInset();
  const styles = useThemedStyles(makeStyles);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation('post');

  const postQuery = useQuery({
    queryKey: ['post', id],
    queryFn: () => getPostById(id!, user!.id),
    enabled: !!id && !!user?.id,
    staleTime: POST_STALE_TIME,
    placeholderData: () => {
      const cachedFeeds = queryClient.getQueriesData<CommunityPostsQueryData>({ queryKey: ['community-posts'] });
      for (const [, data] of cachedFeeds) {
        const found = data?.pages.flatMap((page) => page.posts).find((p) => p.id === id);
        if (found) return found;
      }
      return undefined;
    },
  });

  const post = postQuery.data ?? null;
  const isLoading = postQuery.isLoading && !post;

  const handleRefresh = () => postQuery.refetch();

  const handleToggleLike = async () => {
    if (!user?.id || !post) return;
    const previous = post;
    const updater = (p: CommunityPost) => ({ ...p, liked: !p.liked, likeCount: p.likeCount + (p.liked ? -1 : 1) });
    applyPostUpdateEverywhere(queryClient, post.id, updater);
    try {
      await toggleLike(post.id, user.id, previous.liked);
    } catch {
      applyPostUpdateEverywhere(queryClient, post.id, () => previous);
    }
  };

  const handleAddComment = async (postId: string, text: string, photoUri?: string) => {
    if (!user?.id) return;
    try {
      await addComment(postId, user.id, text, photoUri);
      const updated = await getPostById(postId, user.id);
      if (updated) {
        applyPostUpdateEverywhere(queryClient, postId, () => updated);
      }
      await celebrateXpLevelUp(queryClient, user.id);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!post) return;
    try {
      await deletePost(post.id);
      removePostEverywhere(queryClient, post.id);
      router.back();
    } catch {
      Toast.error(t('deletePostError'));
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!post) return;
    const previous = post;
    const updater = (p: CommunityPost) => ({ ...p, comments: p.comments.filter((comment) => comment.id !== commentId) });
    applyPostUpdateEverywhere(queryClient, post.id, updater);
    try {
      await deleteComment(commentId);
    } catch {
      applyPostUpdateEverywhere(queryClient, post.id, () => previous);
      Toast.error(t('deleteCommentError'));
    }
  };

  const handlePressAuthor = (authorId: string) => {
    router.push({ pathname: '/profile/[id]', params: { id: authorId } });
  };

  const handlePressListing = (listingId: string) => {
    router.push({ pathname: '/listing/[id]', params: { id: listingId } });
  };

  const handlePressEvent = (eventId: string) => {
    router.push({ pathname: '/event/[id]', params: { id: eventId } });
  };

  const contentInsets = {
    paddingTop: topInset,
    paddingBottom: insets.bottom + Metrics.spacing.lg,
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.content, contentInsets]}>
        <PostCardSkeleton />
        <FloatingScreenControls />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.centered}>
        <EmptyState icon={MessageSquare} message={t('postNotFoundMessage')} />
        <FloatingScreenControls />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={[styles.content, contentInsets]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={Metrics.spacing.lg}
        refreshControl={
          <RefreshControl refreshing={postQuery.isRefetching} onRefresh={handleRefresh} tintColor={colors.leaf} colors={[colors.leaf]} />
        }
      >
        <CommunityPostCard
          post={post}
          variant="detail"
          currentUserId={user?.id}
          onToggleLike={handleToggleLike}
          onAddComment={handleAddComment}
          onDelete={handleDelete}
          onDeleteComment={handleDeleteComment}
          onPressAuthor={handlePressAuthor}
          onPressListing={handlePressListing}
          onPressEvent={handlePressEvent}
        />
      </KeyboardAwareScrollView>
      <FloatingScreenControls />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      ...Metrics.layout.centeredContent,
      paddingHorizontal: Metrics.spacing.lg,
    },
    centered: {
      ...Metrics.layout.centeredContent,
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
  });
