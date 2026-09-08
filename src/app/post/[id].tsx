import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Metrics } from '@/theme';
import { CommunityPostCard, LoadingScreen } from '@/components';
import { useAuth } from '@/hooks';
import { addComment, deleteComment, deletePost, getPostById, toggleLike } from '@/services';
import type { CommunityPost } from '@/types';
import { Toast } from '@/utils';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPost = useCallback(async () => {
    if (!id || !user?.id) return;
    const data = await getPostById(id, user.id);
    setPost(data);
  }, [id, user]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchPost().finally(() => setIsLoading(false));
    }, [fetchPost])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPost();
    setRefreshing(false);
  };

  const handleToggleLike = async () => {
    if (!user?.id || !post) return;
    const previous = post;
    setPost({ ...post, liked: !post.liked, likeCount: post.likeCount + (post.liked ? -1 : 1) });
    try {
      await toggleLike(post.id, user.id, previous.liked);
    } catch {
      setPost(previous);
    }
  };

  const handleAddComment = async (postId: string, text: string) => {
    if (!user?.id) return;
    try {
      await addComment(postId, user.id, text);
      const updated = await getPostById(postId, user.id);
      if (updated) setPost(updated);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!post) return;
    try {
      await deletePost(post.id);
      router.back();
    } catch {
      Toast.error('Não foi possível excluir a publicação.');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!post) return;
    const previous = post;
    setPost({ ...post, comments: post.comments.filter((comment) => comment.id !== commentId) });
    try {
      await deleteComment(commentId);
    } catch {
      setPost(previous);
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
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.leaf} colors={[Colors.leaf]} />
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
