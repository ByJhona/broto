import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import Award from 'lucide-react-native/icons/award';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import Settings from 'lucide-react-native/icons/settings';
import Sprout from 'lucide-react-native/icons/sprout';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { useTranslation } from '@/i18n';
import type { CommunityPost, EarnedBadge, PlantEvent, PlantListing, UserProfile } from '@/types';
import {
  Avatar,
  BadgeDetailModal,
  CollapsibleSection,
  CommunityPostCard,
  EmptyState,
  EventCard,
  ListingCard,
  LoadingScreen,
  PixelBadge,
  SectionTitle,
} from '@/components';
import { useAuth, useFollow, usePersistedCollapse, useUserLocation } from '@/hooks';
import {
  getProfile,
  getCommunityPosts,
  getPostById,
  getListingsByUserId,
  getEventsByUserId,
  getUserBadgesWithDetails,
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
  badges: EarnedBadge[];
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

type ProfileBadgesRowProps = {
  title: string;
  badges: EarnedBadge[];
};

type BadgesEmptyStateProps = {
  styles: Styles;
  colors: ThemeColors;
};

function BadgesEmptyState({ styles, colors }: Readonly<BadgesEmptyStateProps>) {
  const { t } = useTranslation('badge');
  return (
    <View style={styles.badgesEmptyState}>
      <Award size={Metrics.icon.large} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
      <Text style={styles.badgesEmptyText}>{t('noBadgesMessage')}</Text>
    </View>
  );
}

function ProfileBadgesRow({ title, badges }: Readonly<ProfileBadgesRowProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [selectedBadge, setSelectedBadge] = useState<EarnedBadge | null>(null);

  return (
    <View style={styles.section}>
      <SectionTitle>{title}</SectionTitle>
      {badges.length === 0 ? (
        <BadgesEmptyState styles={styles} colors={colors} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselRow}>
          {badges.map((badge) => (
            <Pressable key={badge.id} style={styles.badgeItem} onPress={() => setSelectedBadge(badge)}>
              <PixelBadge pixelArt={badge.pixelArt} size={56} />
              <Text style={styles.badgeName} numberOfLines={1}>
                {badge.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      <BadgeDetailModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function profileListingsTitle(isOwnProfile: boolean, t: (key: string) => string): string {
  return isOwnProfile ? t('myListings') : t('listings');
}

function profileEventsTitle(isOwnProfile: boolean, t: (key: string) => string): string {
  return isOwnProfile ? t('myEvents') : t('events');
}

function profileEmptyPostsMessage(
  isOwnProfile: boolean,
  name: string,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  return isOwnProfile ? t('emptyPostsOwn') : t('emptyPostsOther', { name });
}

type ProfileActionsProps = {
  isOwnProfile: boolean;
  following: boolean;
  onToggleFollow: () => void;
  onPressMessage: () => void;
  colors: ThemeColors;
  styles: Styles;
};

function ProfileActions({
  isOwnProfile,
  following,
  onToggleFollow,
  onPressMessage,
  colors,
  styles,
}: Readonly<ProfileActionsProps>) {
  const { t } = useTranslation('profile');
  if (isOwnProfile) return null;
  return (
    <View style={styles.actionsRow}>
      <Pressable style={[styles.followButton, following && styles.followButtonActive]} onPress={onToggleFollow}>
        <Text style={[styles.followButtonText, following && styles.followButtonTextActive]}>
          {following ? t('following') : t('follow')}
        </Text>
      </Pressable>
      <Pressable style={styles.messageButton} onPress={onPressMessage} hitSlop={8}>
        <MessageCircle size={Metrics.icon.normal} color={colors.foreground} strokeWidth={Metrics.icon.strokeWidth} />
      </Pressable>
    </View>
  );
}

type ProfileEmptyPostsProps = {
  hasPosts: boolean;
  isLoading: boolean;
  isOwnProfile: boolean;
  name: string;
  styles: Styles;
};

function ProfileEmptyPosts({ hasPosts, isLoading, isOwnProfile, name, styles }: Readonly<ProfileEmptyPostsProps>) {
  const { t } = useTranslation('profile');
  if (hasPosts || isLoading) return null;
  return (
    <EmptyState
      icon={Sprout}
      title={t('noPostsYet')}
      message={profileEmptyPostsMessage(isOwnProfile, name, t)}
      style={styles.emptyState}
    />
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
  badges,
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
  const { t } = useTranslation('profile');
  return (
    <View>
      <View style={styles.header}>
        <Avatar name={name} url={profile?.avatar_url} size={88} />
        <Text style={styles.name}>{name}</Text>
        {profile?.username ? <Text style={styles.username}>@{profile.username}</Text> : null}

        <View style={styles.countsRow}>
          <View style={styles.countItem}>
            <Text style={styles.countValue}>{counts.followers}</Text>
            <Text style={styles.countLabel}>{t('followers')}</Text>
          </View>
          <View style={styles.countItem}>
            <Text style={styles.countValue}>{counts.following}</Text>
            <Text style={styles.countLabel}>{t('following')}</Text>
          </View>
        </View>

        <ProfileActions
          isOwnProfile={isOwnProfile}
          following={following}
          onToggleFollow={onToggleFollow}
          onPressMessage={onPressMessage}
          colors={colors}
          styles={styles}
        />
      </View>

      <ProfileBadgesRow title={t('badgesTitle')} badges={badges} />

      <ProfileListingsRow
        title={profileListingsTitle(isOwnProfile, t)}
        listings={listings}
        onPressListing={onPressListing}
        isCollapsed={isOffersCollapsed}
        onToggleCollapsed={onToggleOffersCollapsed}
        userLocation={userLocation}
      />

      <ProfileEventsRow
        title={profileEventsTitle(isOwnProfile, t)}
        events={events}
        onPressEvent={onPressEvent}
        isCollapsed={isEventsCollapsed}
        onToggleCollapsed={onToggleEventsCollapsed}
        userLocation={userLocation}
      />

      <ProfileEmptyPosts hasPosts={posts.length > 0} isLoading={isLoading} isOwnProfile={isOwnProfile} name={name} styles={styles} />
    </View>
  );
}

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation('profile');
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { following, counts, toggle } = useFollow(id ?? null);
  const userLocation = useUserLocation();

  const isOwnProfile = id === user?.id;
  const { isCollapsed: isOffersCollapsed, toggleCollapsed: handleToggleOffersCollapsed } =
    usePersistedCollapse(OFFERS_COLLAPSED_KEY);
  const { isCollapsed: isEventsCollapsed, toggleCollapsed: handleToggleEventsCollapsed } =
    usePersistedCollapse(EVENTS_COLLAPSED_KEY);

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

  const badgesQuery = useQuery({
    queryKey: ['badges-by-user', id],
    queryFn: () => getUserBadgesWithDetails(id!),
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
  const badges = badgesQuery.data ?? [];
  const posts = useMemo(() => postsQuery.data?.pages.flatMap((page) => page.posts) ?? [], [postsQuery.data]);
  const isLoading = profileQuery.isLoading || (posts.length === 0 && postsQuery.isFetching);

  const handleRefresh = async () => {
    await Promise.all([
      profileQuery.refetch(),
      listingsQuery.refetch(),
      eventsQuery.refetch(),
      badgesQuery.refetch(),
      postsQuery.refetch(),
    ]);
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
        Toast.error(t('deletePostError'));
      }
    },
    [queryClient, postsQueryKey, t]
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
        Toast.error(t('deleteCommentError'));
      }
    },
    [queryClient, postsQueryKey, t]
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

  const name = profile?.name || profile?.username || t('defaultGardenerName');

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
          refreshing={
            profileQuery.isRefetching ||
            listingsQuery.isRefetching ||
            eventsQuery.isRefetching ||
            badgesQuery.isRefetching ||
            postsQuery.isRefetching
          }
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
            badges={badges}
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
  section: {
    marginBottom: Metrics.spacing.lg,
  },
  badgeItem: {
    alignItems: 'center',
    width: 72,
  },
  badgeName: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: Metrics.spacing.xs,
    textAlign: 'center',
  },
  badgesEmptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.sm,
    backgroundColor: colors.card,
    borderRadius: Metrics.radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Metrics.spacing.md,
  },
  badgesEmptyText: {
    flex: 1,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  emptyState: {
    marginTop: Metrics.spacing.xl,
  },
  loader: {
    marginVertical: Metrics.spacing.lg,
  },
  });
