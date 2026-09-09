import { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Sprout } from 'lucide-react-native';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Colors, Metrics } from '@/theme';
import type { CommunityPost, PlantSummary, UserProfile } from '@/types';
import { Avatar, CommunityPostCard, EmptyState, LoadingScreen, PlantCard, SectionTitle } from '@/components';
import { useAuth, useFollow } from '@/hooks';
import {
  getProfile,
  getCommunityPosts,
  getPostById,
  getPlantsByUserId,
  toggleLike,
  addComment,
  deletePost,
  deleteComment,
  updatePostInAllFeeds,
  removePostFromAllFeeds,
  removeCommentFromAllFeeds,
  type CommunityPostsQueryData,
} from '@/services';
import { Toast } from '@/utils';

const PROFILE_STALE_TIME = 60_000;
const POSTS_STALE_TIME = 30_000;

type ProfileHeaderProps = {
  name: string;
  profile: UserProfile | null;
  isOwnProfile: boolean;
  following: boolean;
  onToggleFollow: () => void;
  counts: { followers: number; following: number };
  plants: PlantSummary[];
  posts: CommunityPost[];
  isLoading: boolean;
};

function ProfileHeader({
  name,
  profile,
  isOwnProfile,
  following,
  onToggleFollow,
  counts,
  plants,
  posts,
  isLoading,
}: ProfileHeaderProps) {
  return (
    <View>
      <View style={styles.header}>
        <Avatar name={name} url={profile?.avatar_url} size={88} />
        <Text style={styles.name}>{name}</Text>
        {profile?.username ? <Text style={styles.username}>@{profile.username}</Text> : null}

        <View style={styles.countsRow}>
          <View style={styles.countItem}>
            <Text style={styles.countValue}>{counts.followers}</Text>
            <Text style={styles.countLabel}>Seguidores</Text>
          </View>
          <View style={styles.countItem}>
            <Text style={styles.countValue}>{counts.following}</Text>
            <Text style={styles.countLabel}>Seguindo</Text>
          </View>
        </View>

        {!isOwnProfile ? (
          <Pressable style={[styles.followButton, following && styles.followButtonActive]} onPress={onToggleFollow}>
            <Text style={[styles.followButtonText, following && styles.followButtonTextActive]}>
              {following ? 'Seguindo' : 'Seguir'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.plantsSection}>
        <SectionTitle style={styles.plantsSectionTitle}>{isOwnProfile ? 'Minhas plantas' : 'Plantas'}</SectionTitle>
        {plants.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.plantsRow}>
            {plants.map((plant) => (
              <PlantCard key={plant.id} plant={plant} readOnly style={styles.plantCard} />
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.plantsEmptyText}>Nenhuma planta cadastrada.</Text>
        )}
      </View>

      {posts.length === 0 && !isLoading ? (
        <EmptyState
          icon={Sprout}
          title="Nenhum recado ainda"
          message={isOwnProfile ? 'Você ainda não publicou nada na comunidade.' : `${name} ainda não publicou nada.`}
          style={styles.emptyState}
        />
      ) : null}
    </View>
  );
}

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { following, counts, toggle } = useFollow(id ?? null);

  const isOwnProfile = id === user?.id;

  const profileQuery = useQuery({
    queryKey: ['profile', id],
    queryFn: () => getProfile(id!),
    enabled: !!id,
    staleTime: PROFILE_STALE_TIME,
  });

  const plantsQuery = useQuery({
    queryKey: ['plants-by-user', id],
    queryFn: () => getPlantsByUserId(id!),
    enabled: !!id,
    staleTime: PROFILE_STALE_TIME,
  });

  const postsQueryKey = useMemo(() => ['community-posts', 'author', id, user?.id] as const, [id, user?.id]);

  const postsQuery = useInfiniteQuery({
    queryKey: postsQueryKey,
    queryFn: ({ pageParam }) => getCommunityPosts(user!.id, pageParam, null, [id!]),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!id && !!user?.id,
    staleTime: POSTS_STALE_TIME,
  });

  const profile = profileQuery.data ?? null;
  const plants = plantsQuery.data ?? [];
  const posts = useMemo(() => postsQuery.data?.pages.flatMap((page) => page.posts) ?? [], [postsQuery.data]);
  const isLoading = profileQuery.isLoading || plantsQuery.isLoading || (posts.length === 0 && postsQuery.isFetching);

  const handleRefresh = async () => {
    await Promise.all([profileQuery.refetch(), plantsQuery.refetch(), postsQuery.refetch()]);
  };

  const handleLoadMore = () => {
    if (postsQuery.hasNextPage && !postsQuery.isFetchingNextPage) {
      postsQuery.fetchNextPage();
    }
  };

  const handleToggleLike = useCallback(
    async (postId: string) => {
      if (!user?.id) return;
      const cached = queryClient.getQueryData<CommunityPostsQueryData>(postsQueryKey);
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
    [user, queryClient, postsQueryKey]
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

  const handleDeletePost = useCallback(
    async (postId: string) => {
      const cached = queryClient.getQueryData<CommunityPostsQueryData>(postsQueryKey);
      const previousPost = cached?.pages.flatMap((page) => page.posts).find((p) => p.id === postId);
      removePostFromAllFeeds(queryClient, postId);
      try {
        await deletePost(postId);
      } catch {
        if (previousPost) updatePostInAllFeeds(queryClient, postId, () => previousPost);
        Toast.error('Não foi possível excluir a publicação.');
      }
    },
    [queryClient, postsQueryKey]
  );

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      const cached = queryClient.getQueryData<CommunityPostsQueryData>(postsQueryKey);
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
    [queryClient, postsQueryKey]
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
      />
    ),
    [user?.id, handleToggleLike, handleAddComment, handleDeletePost, handleDeleteComment]
  );

  if (isLoading && !profile) {
    return <LoadingScreen />;
  }

  const name = profile?.name || profile?.username || 'Jardineiro';

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      data={posts}
      keyExtractor={(post) => post.id}
      renderItem={renderItem}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={profileQuery.isRefetching || plantsQuery.isRefetching || postsQuery.isRefetching}
          onRefresh={handleRefresh}
          tintColor={Colors.leaf}
          colors={[Colors.leaf]}
        />
      }
      ListHeaderComponent={
        <ProfileHeader
          name={name}
          profile={profile}
          isOwnProfile={isOwnProfile}
          following={following}
          onToggleFollow={toggle}
          counts={counts}
          plants={plants}
          posts={posts}
          isLoading={isLoading}
        />
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
    alignItems: 'center',
    marginBottom: Metrics.spacing.lg,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.foreground,
    marginTop: Metrics.spacing.md,
  },
  username: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.leaf,
    marginTop: 2,
  },
  countsRow: {
    flexDirection: 'row',
    gap: Metrics.spacing.xl,
    marginTop: Metrics.spacing.md,
  },
  countItem: {
    alignItems: 'center',
  },
  countValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.foreground,
  },
  countLabel: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  followButton: {
    marginTop: Metrics.spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: Metrics.radius.full,
    paddingVertical: Metrics.spacing.sm,
    paddingHorizontal: Metrics.spacing.xl,
  },
  followButtonActive: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primaryForeground,
  },
  followButtonTextActive: {
    color: Colors.foreground,
  },
  plantsSection: {
    marginBottom: Metrics.spacing.lg,
  },
  plantsSectionTitle: {
    marginLeft: Metrics.spacing.xs,
  },
  plantsEmptyText: {
    fontSize: 13,
    color: Colors.mutedForeground,
    marginLeft: Metrics.spacing.xs,
  },
  plantsRow: {
    gap: Metrics.spacing.md,
  },
  plantCard: {
    width: 140,
  },
  emptyState: {
    marginTop: Metrics.spacing.xl,
  },
  loader: {
    marginVertical: Metrics.spacing.lg,
  },
});
