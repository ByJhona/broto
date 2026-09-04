import { useState, useEffect, useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search } from 'lucide-react-native';
import { Colors, Metrics } from '@/theme';
import { CommunityComposer, CommunityPostCard, SectionTitle } from '@/components';
import type { CommunityPost, CommunityPostType } from '@/types';
import { useAuth } from '@/hooks';
import {
  getCommunityPosts,
  getPostById,
  createPost,
  toggleLike,
  addComment,
  deletePost,
  getFollowingIds,
  supabase,
} from '@/services';
import { useFocusEffect, useRouter } from 'expo-router';
import { Toast } from '@/utils';

let channelInstanceCounter = 0;

type FeedScope = 'todos' | 'seguindo';

const FEED_FILTERS: { value: CommunityPostType | null; label: string }[] = [
  { value: null, label: 'Tudo' },
  { value: 'conquista', label: 'Conquistas' },
  { value: 'duvida', label: 'Dúvidas' },
  { value: 'dica', label: 'Dicas' },
];

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [instanceId] = useState(() => ++channelInstanceCounter);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<CommunityPostType | null>(null);
  const [scope, setScope] = useState<FeedScope>('todos');
  const [followedAuthorIds, setFollowedAuthorIds] = useState<string[] | null>(null);

  const fetchFirstPage = useCallback(async () => {
    if (!user?.id) return;
    setIsInitialLoading(true);
    try {
      const authorIds = scope === 'seguindo' ? await getFollowingIds(user.id) : null;
      const { posts: firstPage, nextCursor } = await getCommunityPosts(user.id, null, filter, authorIds);
      setPosts(firstPage);
      setCursor(nextCursor);
      setHasMore(nextCursor !== null);
      setFollowedAuthorIds(authorIds);
    } catch (error) {
      console.error(error);
    } finally {
      setIsInitialLoading(false);
    }
  }, [user, filter, scope]);

  useFocusEffect(
    useCallback(() => {
      fetchFirstPage();
    }, [fetchFirstPage])
  );

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;

    const upsertPost = async (postId: string) => {
      const post = await getPostById(postId, userId);
      if (!post) return;
      setPosts((current) =>
        current.some((p) => p.id === post.id) ? current.map((p) => (p.id === post.id ? post : p)) : current
      );
    };

    const belongsToFeed = (post: CommunityPost) =>
      (!filter || post.postType === filter) && (scope !== 'seguindo' || !!followedAuthorIds?.includes(post.authorId));

    const channel = supabase
      .channel(`posts:${userId}:${instanceId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async (payload) => {
        const post = await getPostById(payload.new.id, userId);
        if (post && belongsToFeed(post)) {
          setPosts((current) => (current.some((p) => p.id === post.id) ? current : [post, ...current]));
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, (payload) => {
        upsertPost(payload.new.id);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (payload) => {
        setPosts((current) => current.filter((p) => p.id !== payload.old.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, (payload) => {
        const postId = (payload.new as { post_id?: string })?.post_id ?? (payload.old as { post_id?: string })?.post_id;
        if (postId) upsertPost(postId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_comments' }, (payload) => {
        const postId = (payload.new as { post_id?: string })?.post_id ?? (payload.old as { post_id?: string })?.post_id;
        if (postId) upsertPost(postId);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, filter, scope, followedAuthorIds, instanceId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFirstPage();
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore || !user?.id || !cursor) return;
    setIsLoadingMore(true);
    try {
      const { posts: nextPage, nextCursor } = await getCommunityPosts(user.id, cursor, filter, followedAuthorIds);
      setPosts((current) => [...current, ...nextPage]);
      setCursor(nextCursor);
      setHasMore(nextCursor !== null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    if (!user?.id) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    setPosts(current => current.map(p =>
      p.id === postId ? { ...p, liked: !p.liked, likeCount: p.likeCount + (p.liked ? -1 : 1) } : p
    ));

    try {
      await toggleLike(postId, user.id, post.liked);
    } catch {
      setPosts(current => current.map(p =>
        p.id === postId ? { ...p, liked: post.liked, likeCount: post.likeCount } : p
      ));
    }
  };

  const handleAddComment = async (postId: string, text: string) => {
    if (!user?.id) return;
    try {
      await addComment(postId, user.id, text);
      const updated = await getPostById(postId, user.id);
      if (updated) {
        setPosts((current) => current.map((p) => (p.id === postId ? updated : p)));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreatePost = async (text: string, imageUri: string | null, postType: CommunityPostType | null) => {
    if (!user?.id) return;
    try {
      const newPostId = await createPost(user.id, text, imageUri, postType);
      const newPost = await getPostById(newPostId, user.id);
      if (newPost && scope === 'todos' && (!filter || newPost.postType === filter)) {
        setPosts((current) => [newPost, ...current]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePressAuthor = (authorId: string) => {
    router.push({ pathname: '/profile/[id]', params: { id: authorId } });
  };

  const handleDeletePost = async (postId: string) => {
    const previousPosts = posts;
    setPosts((current) => current.filter((p) => p.id !== postId));
    try {
      await deletePost(postId);
    } catch {
      setPosts(previousPosts);
      Toast.error('Não foi possível excluir a publicação.');
    }
  };

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Metrics.spacing.lg }]}
      showsVerticalScrollIndicator={false}
      data={posts}
      keyExtractor={(post) => post.id}
      renderItem={({ item }) => (
        <CommunityPostCard
          post={item}
          currentUserId={user?.id}
          onToggleLike={handleToggleLike}
          onAddComment={handleAddComment}
          onDelete={handleDeletePost}
          onPressAuthor={handlePressAuthor}
        />
      )}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.leaf} colors={[Colors.leaf]} />
      }
      ListHeaderComponent={
        <View>
          <View style={styles.header}>
            <View style={styles.headerTextBox}>
              <Text style={styles.title}>Comunidade</Text>
              <Text style={styles.subtitle}>A comunidade de quem tá aprendendo a cuidar de plantas</Text>
            </View>
            <Pressable style={styles.searchButton} onPress={() => router.push('/search')} hitSlop={8}>
              <Search size={Metrics.icon.normal} color={Colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
            </Pressable>
          </View>

          <CommunityComposer onPost={handleCreatePost} />

          <View style={styles.filtersRow}>
            <View style={styles.scopeRow}>
              <Pressable
                style={[styles.scopeTab, scope === 'todos' && styles.scopeTabActive]}
                onPress={() => setScope('todos')}
              >
                <Text style={[styles.scopeTabText, scope === 'todos' && styles.scopeTabTextActive]}>Todos</Text>
              </Pressable>
              <Pressable
                style={[styles.scopeTab, scope === 'seguindo' && styles.scopeTabActive]}
                onPress={() => setScope('seguindo')}
              >
                <Text style={[styles.scopeTabText, scope === 'seguindo' && styles.scopeTabTextActive]}>Seguindo</Text>
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChipRow}
            >
              {FEED_FILTERS.map((item) => (
                <Pressable
                  key={item.label}
                  style={[styles.filterChip, filter === item.value && styles.filterChipActive]}
                  onPress={() => setFilter(item.value)}
                >
                  <Text style={[styles.filterChipText, filter === item.value && styles.filterChipTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <SectionTitle style={styles.postsSectionTitle}>Publicações</SectionTitle>

          {isInitialLoading ? <ActivityIndicator style={styles.loader} color={Colors.leaf} /> : null}
        </View>
      }
      ListFooterComponent={isLoadingMore ? <ActivityIndicator style={styles.loader} color={Colors.leaf} /> : null}
    />
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Metrics.spacing.sm,
    marginBottom: Metrics.spacing.lg,
  },
  headerTextBox: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.foreground,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: Metrics.radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postsSectionTitle: {
    marginBottom: Metrics.spacing.md,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.xs,
    marginBottom: Metrics.spacing.lg,
  },
  scopeRow: {
    flexDirection: 'row',
    backgroundColor: Colors.muted,
    borderRadius: Metrics.radius.full,
    padding: 2,
  },
  scopeTab: {
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: Metrics.spacing.sm,
    borderRadius: Metrics.radius.full,
  },
  scopeTabActive: {
    backgroundColor: Colors.white,
  },
  scopeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.mutedForeground,
  },
  scopeTabTextActive: {
    color: Colors.leaf,
  },
  filterChipRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    backgroundColor: Colors.muted,
    borderRadius: Metrics.radius.full,
    paddingVertical: 5,
    paddingHorizontal: Metrics.spacing.sm,
  },
  filterChipActive: {
    backgroundColor: Colors.leafForeground,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.mutedForeground,
  },
  filterChipTextActive: {
    color: Colors.leaf,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.mutedForeground,
    marginTop: Metrics.spacing.xs,
  },
  loader: {
    marginVertical: Metrics.spacing.lg,
  },
});
