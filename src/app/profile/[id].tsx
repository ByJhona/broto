import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Sprout } from 'lucide-react-native';
import { Colors, Metrics } from '@/theme';
import type { CommunityPost, Plant, UserProfile } from '@/types';
import { Avatar, CommunityPostCard, EmptyState, LoadingScreen, PlantCard, SectionTitle } from '@/components';
import { useAuth, useFollow } from '@/hooks';
import { getProfile, getCommunityPosts, getPostById, getPlantsByUserId, toggleLike, addComment, deletePost } from '@/services';
import { Toast } from '@/utils';

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { following, counts, toggle } = useFollow(id ?? null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isOwnProfile = id === user?.id;

  const fetchAll = useCallback(async () => {
    if (!id || !user?.id) return;
    setIsLoading(true);
    try {
      const [profileData, plantsData, feedPage] = await Promise.all([
        getProfile(id),
        getPlantsByUserId(id),
        getCommunityPosts(user.id, null, null, [id]),
      ]);
      setProfile(profileData);
      setPlants(plantsData);
      setPosts(feedPage.posts);
      setCursor(feedPage.nextCursor);
      setHasMore(feedPage.nextCursor !== null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [id, user]);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore || !user?.id || !cursor || !id) return;
    setIsLoadingMore(true);
    try {
      const { posts: nextPage, nextCursor } = await getCommunityPosts(user.id, cursor, null, [id]);
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
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    setPosts((current) =>
      current.map((p) => (p.id === postId ? { ...p, liked: !p.liked, likeCount: p.likeCount + (p.liked ? -1 : 1) } : p))
    );

    try {
      await toggleLike(postId, user.id, post.liked);
    } catch {
      setPosts((current) => current.map((p) => (p.id === postId ? { ...p, liked: post.liked, likeCount: post.likeCount } : p)));
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
    } catch (err) {
      console.error(err);
    }
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
      renderItem={({ item }) => (
        <CommunityPostCard
          post={item}
          currentUserId={user?.id}
          onToggleLike={handleToggleLike}
          onAddComment={handleAddComment}
          onDelete={handleDeletePost}
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
              <Pressable
                style={[styles.followButton, following && styles.followButtonActive]}
                onPress={toggle}
              >
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
