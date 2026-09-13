import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import Settings from 'lucide-react-native/icons/settings';
import Sprout from 'lucide-react-native/icons/sprout';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import type { CommunityPost, PlantEvent, PlantListing, UserProfile } from '@/types';
import { Avatar, CollapsibleSection, CommunityPostCard, EmptyState, EventCard, ListingCard, LoadingScreen } from '@/components';
import { useAuth, useFollow, useUserLocation } from '@/hooks';
import {
  getProfile,
  getCommunityPosts,
  getPostById,
  getListingsByUserId,
  getEventsByUserId,
  toggleLike,
  addComment,
  deletePost,
  deleteComment,
  updatePostInAllFeeds,
  removePostFromAllFeeds,
  removeCommentFromAllFeeds,
  type CommunityPostsQueryData,
} from '@/services';
import { formatDistanceTo, Toast } from '@/utils';

const PROFILE_STALE_TIME = 60_000;
const POSTS_STALE_TIME = 30_000;
const OFFERS_COLLAPSED_KEY = 'broto:profile-offers-collapsed';
const EVENTS_COLLAPSED_KEY = 'broto:profile-events-collapsed';

type ProfileHeaderProps = {
  name: string;
  profile: UserProfile | null;
  isOwnProfile: boolean;
  following: boolean;
  onToggleFollow: () => void;
  onPressMessage: () => void;
  counts: { followers: number; following: number };
  listings: PlantListing[];
  events: PlantEvent[];
  posts: CommunityPost[];
  isLoading: boolean;
  onPressListing: (listingId: string) => void;
  onPressEvent: (eventId: string) => void;
  isOffersCollapsed: boolean;
  onToggleOffersCollapsed: () => void;
  isEventsCollapsed: boolean;
  onToggleEventsCollapsed: () => void;
  userLocation: { latitude: number; longitude: number } | null;
};

type ProfileListingsRowProps = {
  title: string;
  listings: PlantListing[];
  onPressListing: (listingId: string) => void;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  userLocation: { latitude: number; longitude: number } | null;
};

function ProfileListingsRow({
  title,
  listings,
  onPressListing,
  isCollapsed,
  onToggleCollapsed,
  userLocation,
}: Readonly<ProfileListingsRowProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (listings.length === 0) return null;

  return (
    <CollapsibleSection title={title} isCollapsed={isCollapsed} onToggleCollapsed={onToggleCollapsed}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselRow}>
        {listings.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            distanceLabel={formatDistanceTo(userLocation, listing.latitude, listing.longitude)}
            onPress={() => onPressListing(listing.id)}
          />
        ))}
      </ScrollView>
    </CollapsibleSection>
  );
}

type ProfileEventsRowProps = {
  title: string;
  events: PlantEvent[];
  onPressEvent: (eventId: string) => void;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  userLocation: { latitude: number; longitude: number } | null;
};

function ProfileEventsRow({
  title,
  events,
  onPressEvent,
  isCollapsed,
  onToggleCollapsed,
  userLocation,
}: Readonly<ProfileEventsRowProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (events.length === 0) return null;

  return (
    <CollapsibleSection title={title} isCollapsed={isCollapsed} onToggleCollapsed={onToggleCollapsed}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselRow}>
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            distanceLabel={formatDistanceTo(userLocation, event.latitude, event.longitude)}
            onPress={() => onPressEvent(event.id)}
          />
        ))}
      </ScrollView>
    </CollapsibleSection>
  );
}

function ProfileHeader({
  name,
  profile,
  isOwnProfile,
  following,
  onToggleFollow,
  onPressMessage,
  counts,
  listings,
  events,
  posts,
  isLoading,
  onPressListing,
  onPressEvent,
  isOffersCollapsed,
  onToggleOffersCollapsed,
  isEventsCollapsed,
  onToggleEventsCollapsed,
  userLocation,
}: Readonly<ProfileHeaderProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
          <View style={styles.actionsRow}>
            <Pressable style={[styles.followButton, following && styles.followButtonActive]} onPress={onToggleFollow}>
              <Text style={[styles.followButtonText, following && styles.followButtonTextActive]}>
                {following ? 'Seguindo' : 'Seguir'}
              </Text>
            </Pressable>
            <Pressable style={styles.messageButton} onPress={onPressMessage} hitSlop={8}>
              <MessageCircle size={Metrics.icon.normal} color={colors.foreground} strokeWidth={Metrics.icon.strokeWidth} />
            </Pressable>
          </View>
        ) : null}
      </View>

      <ProfileListingsRow
        title={isOwnProfile ? 'Minhas ofertas' : 'Ofertas'}
        listings={listings}
        onPressListing={onPressListing}
        isCollapsed={isOffersCollapsed}
        onToggleCollapsed={onToggleOffersCollapsed}
        userLocation={userLocation}
      />

      <ProfileEventsRow
        title={isOwnProfile ? 'Meus eventos' : 'Eventos'}
        events={events}
        onPressEvent={onPressEvent}
        isCollapsed={isEventsCollapsed}
        onToggleCollapsed={onToggleEventsCollapsed}
        userLocation={userLocation}
      />

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
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { following, counts, toggle } = useFollow(id ?? null);
  const userLocation = useUserLocation();

  const isOwnProfile = id === user?.id;
  const [isOffersCollapsed, setIsOffersCollapsed] = useState(false);
  const [isEventsCollapsed, setIsEventsCollapsed] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(OFFERS_COLLAPSED_KEY).then((stored) => {
      if (stored === '1') setIsOffersCollapsed(true);
    });
    AsyncStorage.getItem(EVENTS_COLLAPSED_KEY).then((stored) => {
      if (stored === '1') setIsEventsCollapsed(true);
    });
  }, []);

  const handleToggleOffersCollapsed = () => {
    setIsOffersCollapsed((current) => {
      const next = !current;
      AsyncStorage.setItem(OFFERS_COLLAPSED_KEY, next ? '1' : '0');
      return next;
    });
  };

  const handleToggleEventsCollapsed = () => {
    setIsEventsCollapsed((current) => {
      const next = !current;
      AsyncStorage.setItem(EVENTS_COLLAPSED_KEY, next ? '1' : '0');
      return next;
    });
  };

  const profileQuery = useQuery({
    queryKey: ['profile', id],
    queryFn: () => getProfile(id!),
    enabled: !!id,
    staleTime: PROFILE_STALE_TIME,
  });

  const listingsQuery = useQuery({
    queryKey: ['listings-by-user', id],
    queryFn: () => getListingsByUserId(id!),
    enabled: !!id,
    staleTime: PROFILE_STALE_TIME,
  });

  const eventsQuery = useQuery({
    queryKey: ['events-by-user', id, user?.id],
    queryFn: () => getEventsByUserId(id!, user?.id),
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
  const listings = listingsQuery.data ?? [];
  const events = eventsQuery.data ?? [];
  const posts = useMemo(() => postsQuery.data?.pages.flatMap((page) => page.posts) ?? [], [postsQuery.data]);
  const isLoading = profileQuery.isLoading || (posts.length === 0 && postsQuery.isFetching);

  const handleRefresh = async () => {
    await Promise.all([profileQuery.refetch(), listingsQuery.refetch(), eventsQuery.refetch(), postsQuery.refetch()]);
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

  const handlePressListing = useCallback(
    (listingId: string) => {
      router.push({ pathname: '/listing/[id]', params: { id: listingId } });
    },
    [router]
  );

  const handlePressMessage = useCallback(() => {
    router.push({ pathname: '/chat', params: { otherUserId: id! } });
  }, [router, id]);

  const handlePressEvent = useCallback(
    (eventId: string) => {
      router.push({ pathname: '/event/[id]', params: { id: eventId } });
    },
    [router]
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
        onPressListing={handlePressListing}
        onPressEvent={handlePressEvent}
      />
    ),
    [user?.id, handleToggleLike, handleAddComment, handleDeletePost, handleDeleteComment, handlePressListing, handlePressEvent]
  );

  if (isLoading && !profile) {
    return <LoadingScreen />;
  }

  const name = profile?.name || profile?.username || 'Jardineiro';

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Metrics.spacing.lg }]}
      showsVerticalScrollIndicator={false}
      data={posts}
      keyExtractor={(post) => post.id}
      renderItem={renderItem}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={profileQuery.isRefetching || listingsQuery.isRefetching || eventsQuery.isRefetching || postsQuery.isRefetching}
          onRefresh={handleRefresh}
          tintColor={colors.leaf}
          colors={[colors.leaf]}
        />
      }
      ListHeaderComponent={
        <>
          <Stack.Screen
            options={
              isOwnProfile
                ? {
                    headerRight: () => (
                      <Pressable onPress={() => router.push('/profile/settings')} hitSlop={8}>
                        <Settings size={Metrics.icon.normal} color={colors.foreground} strokeWidth={Metrics.icon.strokeWidth} />
                      </Pressable>
                    ),
                  }
                : undefined
            }
          />
          <ProfileHeader
            name={name}
            profile={profile}
            isOwnProfile={isOwnProfile}
            following={following}
            onToggleFollow={toggle}
            onPressMessage={handlePressMessage}
            counts={counts}
            listings={listings}
            events={events}
            posts={posts}
            isLoading={isLoading}
            onPressListing={handlePressListing}
            onPressEvent={handlePressEvent}
            isOffersCollapsed={isOffersCollapsed}
            onToggleOffersCollapsed={handleToggleOffersCollapsed}
            isEventsCollapsed={isEventsCollapsed}
            onToggleEventsCollapsed={handleToggleEventsCollapsed}
            userLocation={userLocation}
          />
        </>
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
    ...Metrics.layout.centeredContent,
    padding: Metrics.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Metrics.spacing.lg,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.foreground,
    marginTop: Metrics.spacing.md,
  },
  username: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.leaf,
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
    color: colors.foreground,
  },
  countLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.sm,
    marginTop: Metrics.spacing.md,
  },
  followButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: Metrics.radius.full,
    paddingVertical: Metrics.spacing.sm,
    paddingHorizontal: Metrics.spacing.xl,
  },
  followButtonActive: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryForeground,
  },
  followButtonTextActive: {
    color: colors.foreground,
  },
  messageButton: {
    width: 44,
    height: 44,
    borderRadius: Metrics.radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselRow: {
    gap: Metrics.spacing.md,
  },
  emptyState: {
    marginTop: Metrics.spacing.xl,
  },
  loader: {
    marginVertical: Metrics.spacing.lg,
  },
  });
