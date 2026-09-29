import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  getCommunityPosts,
  getFeaturedPosts,
  getFollowingIds,
  subscribeToNewPosts,
  communityFeedQueryKey,
  interleaveFeaturedPosts,
  postMatchesFeed,
} from '@/services';
import { FOLLOWING_FEED_FILTER, type CommunityFeedFilter } from '@/types';
import { usePostActions } from './usePostActions';

const POSTS_STALE_TIME = 30_000;
const FOLLOWING_IDS_STALE_TIME = 5 * 60_000;

export function useCommunityFeed() {
  const router = useRouter();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<CommunityFeedFilter | null>(null);
  const [newPostsCount, setNewPostsCount] = useState(0);
  const isFollowingFeed = filter === FOLLOWING_FEED_FILTER;

  const followingIdsQuery = useQuery({
    queryKey: ['following-ids', user?.id],
    queryFn: () => getFollowingIds(user!.id),
    enabled: !!user?.id && isFollowingFeed,
    staleTime: FOLLOWING_IDS_STALE_TIME,
  });

  const followedAuthorIds = followingIdsQuery.data ?? null;

  const featuredPostsQuery = useQuery({
    queryKey: ['featured-posts', user?.id],
    queryFn: () => getFeaturedPosts(user!.id),
    enabled: !!user?.id,
  });

  const queryKey = useMemo(() => communityFeedQueryKey(filter, user?.id), [filter, user?.id]);

  const postsQuery = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      getCommunityPosts(
        user!.id,
        pageParam,
        filter === FOLLOWING_FEED_FILTER ? null : filter,
        isFollowingFeed ? followedAuthorIds : null
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!user?.id && (!isFollowingFeed || followedAuthorIds !== null),
    staleTime: POSTS_STALE_TIME,
  });

  const isFeedComplete = postsQuery.isSuccess && !postsQuery.hasNextPage;

  const posts = useMemo(() => {
    const regular = postsQuery.data?.pages.flatMap((page) => page.posts) ?? [];
    const featured = (featuredPostsQuery.data ?? []).filter((post) => postMatchesFeed(post, filter, followedAuthorIds));
    return interleaveFeaturedPosts(regular, featured, isFeedComplete);
  }, [postsQuery.data, featuredPostsQuery.data, filter, followedAuthorIds, isFeedComplete]);

  const postActions = usePostActions(posts);

  const isInitialLoading = !postsQuery.data && (postsQuery.isFetching || (isFollowingFeed && followingIdsQuery.isFetching));
  const followsNobody = isFollowingFeed && followedAuthorIds?.length === 0;

  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToNewPosts((event) => {
      if (event.authorId === user.id) return;
      if (postMatchesFeed(event, filter, followedAuthorIds)) setNewPostsCount((count) => count + 1);
    });

    return unsubscribe;
  }, [user?.id, filter, followedAuthorIds]);

  const handleSetFilter = (nextFilter: CommunityFeedFilter | null) => {
    setNewPostsCount(0);
    setFilter(nextFilter);
  };

  const handleShowNewPosts = async () => {
    setNewPostsCount(0);
    await postsQuery.refetch();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([postsQuery.refetch(), featuredPostsQuery.refetch()]);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (postsQuery.hasNextPage && !postsQuery.isFetchingNextPage) {
      postsQuery.fetchNextPage();
    }
  };

  const handlePressAuthor = useCallback(
    (authorId: string) => router.push({ pathname: '/profile/[id]', params: { id: authorId } }),
    [router]
  );

  const handlePressListing = useCallback(
    (listingId: string) => router.push({ pathname: '/listing/[id]', params: { id: listingId } }),
    [router]
  );

  const handlePressEvent = useCallback(
    (eventId: string) => router.push({ pathname: '/event/[id]', params: { id: eventId } }),
    [router]
  );

  return {
    user,
    posts,
    isInitialLoading,
    followsNobody,
    refreshing,
    postsQuery,
    filter,
    setFilter: handleSetFilter,
    newPostsCount,
    handleShowNewPosts,
    handleRefresh,
    handleLoadMore,
    handleToggleLike: postActions.handleToggleLike,
    handlePressAuthor,
    handlePressListing,
    handlePressEvent,
    handleDeletePost: postActions.handleDeletePost,
    handleBoostPost: postActions.handleBoostPost,
  };
}
