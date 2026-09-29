import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Settings from 'lucide-react-native/icons/settings';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Metrics, useColors, type ThemeColors, useThemedStyles } from '@/theme';
import { useTranslation } from '@/i18n';
import { FloatingScreenControls } from '../FloatingScreenControls';
import { useScreenTopInset } from '../ScreenHeader';
import { ProfileGridRowView } from './ProfileGridRowView';
import { ProfileHeader } from './ProfileHeader';
import { ProfileGridSkeleton, ProfileSkeleton, ProfileTabEmpty } from './ProfileStates';
import { buildProfileRows, PROFILE_TAB, type ProfileGridRow, type ProfileTab } from './profileTabs';
import { useAuth, useFollow, usePostActions, useUserLocation, useXp } from '@/hooks';
import {
  authorPostsQueryKey,
  getCommunityPosts,
  getEventsByUserId,
  getListingsByUserId,
  getProfile,
  getUserBadgesWithDetails,
} from '@/services';

const PROFILE_STALE_TIME = 60_000;
const POSTS_STALE_TIME = 30_000;

type ProfileViewProps = {
  userId: string;
  showBack?: boolean;
};

export function ProfileView({ userId: id, showBack = true }: Readonly<ProfileViewProps>) {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = useScreenTopInset();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('profile');
  const { user } = useAuth();
  const { following, counts, toggle } = useFollow(id ?? null);
  const userLocation = useUserLocation();
  const xp = useXp(id);
  const [tab, setTab] = useState<ProfileTab>(PROFILE_TAB.POSTS);
  const isOwnProfile = id === user?.id;

  const profileQuery = useQuery({
    queryKey: ['profile', id],
    queryFn: () => getProfile(id),
    enabled: !!id,
    staleTime: PROFILE_STALE_TIME,
  });

  const listingsQuery = useQuery({
    queryKey: ['plant-listings', 'by-user', id],
    queryFn: () => getListingsByUserId(id),
    enabled: !!id,
    staleTime: PROFILE_STALE_TIME,
  });

  const eventsQuery = useQuery({
    queryKey: ['events', 'by-user', id, user?.id],
    queryFn: () => getEventsByUserId(id, user?.id),
    enabled: !!id,
    staleTime: PROFILE_STALE_TIME,
  });

  const badgesQuery = useQuery({
    queryKey: ['badges-by-user', id],
    queryFn: () => getUserBadgesWithDetails(id),
    enabled: !!id,
    staleTime: PROFILE_STALE_TIME,
  });

  const postsQueryKey = useMemo(() => authorPostsQueryKey(id, user?.id), [id, user?.id]);

  const postsQuery = useInfiniteQuery({
    queryKey: postsQueryKey,
    queryFn: ({ pageParam }) => getCommunityPosts(user!.id, pageParam, null, [id]),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!id && !!user?.id,
    staleTime: POSTS_STALE_TIME,
  });

  const profile = profileQuery.data ?? null;
  const posts = useMemo(() => postsQuery.data?.pages.flatMap((page) => page.posts) ?? [], [postsQuery.data]);
  const postActions = usePostActions(posts);
  const listings = listingsQuery.data ?? [];
  const events = eventsQuery.data ?? [];
  const rows = buildProfileRows(tab, { posts, listings, events });
  const tabQueries = { posts: postsQuery, listings: listingsQuery, events: eventsQuery };
  const isTabLoading = tabQueries[tab].isLoading;
  const isRefreshing = [profileQuery, listingsQuery, eventsQuery, badgesQuery, postsQuery].some((query) => query.isRefetching);

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
    if (tab === PROFILE_TAB.POSTS && postsQuery.hasNextPage && !postsQuery.isFetchingNextPage) {
      postsQuery.fetchNextPage();
    }
  };

  const openListing = (listingId: string) => router.push({ pathname: '/listing/[id]', params: { id: listingId } });
  const openEvent = (eventId: string) => router.push({ pathname: '/event/[id]', params: { id: eventId } });
  const openChat = () => router.push({ pathname: '/chat', params: { otherUserId: id } });
  const manageTab = isOwnProfile && tab !== PROFILE_TAB.POSTS ? tab : null;
  const openManage = manageTab ? () => router.push({ pathname: '/my-offers', params: { tab: manageTab } }) : undefined;

  const contentInsets = {
    paddingTop: topInset,
    paddingBottom: insets.bottom + Metrics.spacing.xl,
  };

  if (profileQuery.isLoading) {
    return (
      <View style={[styles.container, styles.content, contentInsets]}>
        <ProfileSkeleton />
        <FloatingScreenControls showBack={showBack} />
      </View>
    );
  }

  const name = profile?.name || profile?.username || t('defaultGardenerName');

  const renderRow = ({ item }: { item: ProfileGridRow }) => (
    <ProfileGridRowView
      row={item}
      userLocation={userLocation}
      currentUserId={user?.id}
      postActions={postActions}
      onPressListing={openListing}
      onPressEvent={openEvent}
    />
  );

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={[styles.content, contentInsets]}
        showsVerticalScrollIndicator={false}
        data={rows}
        keyExtractor={(row) => row.key}
        renderItem={renderRow}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.leaf} colors={[colors.leaf]} />
        }
        ListHeaderComponent={
          <ProfileHeader
            name={name}
            profile={profile}
            isOwnProfile={isOwnProfile}
            following={following}
            counts={counts}
            xp={xp}
            badges={badgesQuery.data ?? []}
            tab={tab}
            onChangeTab={setTab}
            onToggleFollow={toggle}
            onPressMessage={openChat}
            onEditProfile={() => router.push('/profile/edit')}
            onManage={openManage}
          />
        }
        ListEmptyComponent={
          isTabLoading ? <ProfileGridSkeleton tab={tab} /> : <ProfileTabEmpty tab={tab} isOwnProfile={isOwnProfile} name={name} />
        }
        ListFooterComponent={postsQuery.isFetchingNextPage ? <ActivityIndicator style={styles.loader} color={colors.leaf} /> : null}
      />
      <FloatingScreenControls
        showBack={showBack}
        onOpenActions={isOwnProfile ? () => router.push('/profile/settings') : undefined}
        actionIcon={Settings}
        actionLabel={t('settingsTitle')}
      />
    </View>
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
      paddingHorizontal: Metrics.spacing.lg,
    },
    loader: {
      marginVertical: Metrics.spacing.lg,
    },
  });
