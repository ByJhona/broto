import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Colors, Metrics } from '@/theme';
import { CommunityPostCard, LoadingScreen } from '@/components';
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

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!post) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Publicação não encontrada.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={postQuery.isRefetching} onRefresh={handleRefresh} tintColor={Colors.leaf} colors={[Colors.leaf]} />
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
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Metrics.spacing.lg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  emptyText: {
    color: Colors.mutedForeground,
    fontSize: 15,
  },
});
