import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View, RefreshControl, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Search from 'lucide-react-native/icons/search';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
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
  deleteComment,
  getFollowingIds,
  updatePostInAllFeeds,
  removePostFromAllFeeds,
  removeCommentFromAllFeeds,
  type CommunityPostsQueryData,
} from '@/services';
import { useRouter } from 'expo-router';
import { Toast } from '@/utils';

type FeedScope = 'todos' | 'seguindo';

const FEED_FILTERS: { value: CommunityPostType | null; label: string }[] = [
  { value: null, label: 'Tudo' },
  { value: 'conquista', label: 'Conquistas' },
  { value: 'duvida', label: 'Dúvidas' },
  { value: 'dica', label: 'Dicas' },
];

const POSTS_STALE_TIME = 30_000;
const FOLLOWING_IDS_STALE_TIME = 5 * 60_000;

type PostsQueryData = CommunityPostsQueryData;

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<CommunityPostType | null>(null);
  const [scope, setScope] = useState<FeedScope>('todos');

  const followingIdsQuery = useQuery({
    queryKey: ['following-ids', user?.id],
    queryFn: () => getFollowingIds(user!.id),
    enabled: !!user?.id && scope === 'seguindo',
    staleTime: FOLLOWING_IDS_STALE_TIME,
  });

  const followedAuthorIds = followingIdsQuery.data ?? null;

  const queryKey = useMemo(
    () => ['community-posts', scope, filter, user?.id] as const,
    [scope, filter, user?.id]
  );

  const postsQuery = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      getCommunityPosts(user!.id, pageParam, filter, scope === 'seguindo' ? followedAuthorIds : null),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!user?.id && (scope === 'todos' || followedAuthorIds !== null),
    staleTime: POSTS_STALE_TIME,
  });

  const posts = useMemo(() => postsQuery.data?.pages.flatMap((page) => page.posts) ?? [], [postsQuery.data]);
  const isInitialLoading =
    posts.length === 0 && (postsQuery.isFetching || (scope === 'seguindo' && followingIdsQuery.isFetching));

  const handleRefresh = async () => {
    setRefreshing(true);
    await postsQuery.refetch();
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (postsQuery.hasNextPage && !postsQuery.isFetchingNextPage) {
      postsQuery.fetchNextPage();
    }
  };

  const handleToggleLike = useCallback(
    async (postId: string) => {
      if (!user?.id) return;
      const cached = queryClient.getQueryData<PostsQueryData>(queryKey);
      const post = cached?.pages.flatMap((page) => page.posts).find((p) => p.id === postId);
      if (!post) return;

      const wasLiked = post.liked;
      updatePostInAllFeeds(queryClient, postId, (p) => ({
        ...p,
        liked: !p.liked,
        likeCount: p.likeCount + (p.liked ? -1 : 1),
      }));

      try {
        await toggleLike(postId, user.id, wasLiked);
      } catch {
        updatePostInAllFeeds(queryClient, postId, () => post);
      }
    },
    [user, queryClient, queryKey]
  );

  const handleAddComment = useCallback(
    async (postId: string, text: string) => {
      if (!user?.id) return;
      try {
        await addComment(postId, user.id, text);
        const updated = await getPostById(postId, user.id);
        if (updated) updatePostInAllFeeds(queryClient, postId, () => updated);
      } catch (error) {
        console.error(error);
      }
    },
    [user, queryClient]
  );

  const handleCreatePost = async (text: string, imageUri: string | null, postType: CommunityPostType | null) => {
    if (!user?.id) return;
    try {
      const newPostId = await createPost(user.id, text, imageUri, postType);
      const newPost = await getPostById(newPostId, user.id);
      if (newPost && scope === 'todos' && (!filter || newPost.postType === filter)) {
        queryClient.setQueryData<PostsQueryData>(queryKey, (old) => {
          if (!old) return old;
          const [firstPage, ...restPages] = old.pages;
          return { ...old, pages: [{ ...firstPage, posts: [newPost, ...firstPage.posts] }, ...restPages] };
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePressAuthor = useCallback(
    (authorId: string) => {
      router.push({ pathname: '/profile/[id]', params: { id: authorId } });
    },
    [router]
  );

  const handleDeletePost = useCallback(
    async (postId: string) => {
      const cached = queryClient.getQueryData<PostsQueryData>(queryKey);
      const previousPost = cached?.pages.flatMap((page) => page.posts).find((p) => p.id === postId);
      removePostFromAllFeeds(queryClient, postId);
      try {
        await deletePost(postId);
      } catch {
        if (previousPost) {
          queryClient.setQueryData<PostsQueryData>(queryKey, (old) => {
            if (!old) return old;
            const [firstPage, ...restPages] = old.pages;
            return { ...old, pages: [{ ...firstPage, posts: [previousPost, ...firstPage.posts] }, ...restPages] };
          });
        }
        Toast.error('Não foi possível excluir a publicação.');
      }
    },
    [queryClient, queryKey]
  );

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      const cached = queryClient.getQueryData<PostsQueryData>(queryKey);
      const previousPost = cached?.pages
        .flatMap((page) => page.posts)
        .find((post) => post.comments.some((comment) => comment.id === commentId));
      removeCommentFromAllFeeds(queryClient, commentId);
      try {
        await deleteComment(commentId);
      } catch {
        if (previousPost) updatePostInAllFeeds(queryClient, previousPost.id, () => previousPost);
        Toast.error('Não foi possível excluir o recado.');
      }
    },
    [queryClient, queryKey]
  );

  const renderItem = useCallback(
    ({ item }: { item: CommunityPost }) => (
      <CommunityPostCard
        post={item}
        currentUserId={user?.id}
        onToggleLike={handleToggleLike}
        onAddComment={handleAddComment}
        onDelete={handleDeletePost}
        onDeleteComment={handleDeleteComment}
        onPressAuthor={handlePressAuthor}
      />
    ),
    [user?.id, handleToggleLike, handleAddComment, handleDeletePost, handleDeleteComment, handlePressAuthor]
  );

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Metrics.spacing.lg }]}
      showsVerticalScrollIndicator={false}
      data={posts}
      keyExtractor={(post) => post.id}
      renderItem={renderItem}
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
      ListFooterComponent={postsQuery.isFetchingNextPage ? <ActivityIndicator style={styles.loader} color={Colors.leaf} /> : null}
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
