import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View, RefreshControl, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Search from 'lucide-react-native/icons/search';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Metrics, useColors, type ThemeColors } from '@/theme';
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
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
      Toast.error('Não foi possível publicar. Tente novamente.');
      throw err;
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
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.leaf} colors={[colors.leaf]} />
      }
      ListHeaderComponent={
        <View>
          <View style={styles.header}>
            <View style={styles.headerTextBox}>
              <Text style={styles.title}>Comunidade</Text>
              <Text style={styles.subtitle}>A comunidade de quem tá aprendendo a cuidar de plantas</Text>
            </View>
            <Pressable style={styles.searchButton} onPress={() => router.push('/search')} hitSlop={8}>
              <Search size={Metrics.icon.normal} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
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

          {isInitialLoading ? <ActivityIndicator style={styles.loader} color={colors.leaf} /> : null}
        </View>
      }
      ListFooterComponent={postsQuery.isFetchingNextPage ? <ActivityIndicator style={styles.loader} color={colors.leaf} /> : null}
    />
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.foreground,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: Metrics.radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.muted,
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
    backgroundColor: colors.card,
  },
  scopeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  scopeTabTextActive: {
    color: colors.leaf,
  },
  filterChipRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    backgroundColor: colors.muted,
    borderRadius: Metrics.radius.full,
    paddingVertical: 5,
    paddingHorizontal: Metrics.spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.leafForeground,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  filterChipTextActive: {
    color: colors.leaf,
  },
  subtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginTop: Metrics.spacing.xs,
  },
  loader: {
    marginVertical: Metrics.spacing.lg,
  },
  });
