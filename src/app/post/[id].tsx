import { useMemo } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import MessageSquare from 'lucide-react-native/icons/message-square';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { CommunityPostCard, EmptyState, LoadingScreen } from '@/components';
import { useAuth } from '@/hooks';
import {
  addComment,
  deleteComment,
  deletePost,
  getPostById,
  toggleLike,
  updatePostInAllFeeds,
  removePostFromAllFeeds,
  type CommunityPostsQueryData,
} from '@/services';
import type { CommunityPost } from '@/types';
import { Toast } from '@/utils';

const POST_STALE_TIME = 30_000;

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
    // ['post', id] can still be empty here even though `post` has a value — placeholderData
    // isn't written to the cache, so the updater must tolerate a missing current entry.
    queryClient.setQueryData(['post', id], (current: CommunityPost | undefined) => (current ? updater(current) : current));
    updatePostInAllFeeds(queryClient, post.id, updater);
    try {
      await toggleLike(post.id, user.id, previous.liked);
    } catch {
      queryClient.setQueryData(['post', id], previous);
      updatePostInAllFeeds(queryClient, post.id, () => previous);
    }
  };

  const handleAddComment = async (postId: string, text: string) => {
    if (!user?.id) return;
    try {
      await addComment(postId, user.id, text);
      const updated = await getPostById(postId, user.id);
      if (updated) {
        queryClient.setQueryData(['post', id], updated);
        updatePostInAllFeeds(queryClient, postId, () => updated);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!post) return;
    try {
      await deletePost(post.id);
      removePostFromAllFeeds(queryClient, post.id);
      router.back();
    } catch {
      Toast.error('Não foi possível excluir a publicação.');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!post) return;
    const previous = post;
    const updater = (p: CommunityPost) => ({ ...p, comments: p.comments.filter((comment) => comment.id !== commentId) });
    queryClient.setQueryData(['post', id], (current: CommunityPost | undefined) => (current ? updater(current) : current));
    updatePostInAllFeeds(queryClient, post.id, updater);
    try {
      await deleteComment(commentId);
    } catch {
      queryClient.setQueryData(['post', id], previous);
      updatePostInAllFeeds(queryClient, post.id, () => previous);
      Toast.error('Não foi possível excluir o recado.');
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

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!post) {
    return (
      <View style={styles.centered}>
        <EmptyState icon={MessageSquare} message="Publicação não encontrada." />
      </View>
    );
  }

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Metrics.spacing.lg }]}
      keyboardShouldPersistTaps="handled"
      bottomOffset={Metrics.spacing.lg}
      refreshControl={
        <RefreshControl refreshing={postQuery.isRefetching} onRefresh={handleRefresh} tintColor={colors.leaf} colors={[colors.leaf]} />
      }
    >
      <CommunityPostCard
        post={post}
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
    padding: Metrics.spacing.lg,
  },
  centered: {
    ...Metrics.layout.centeredContent,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  });
