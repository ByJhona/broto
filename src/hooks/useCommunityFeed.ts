import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useEvents } from './useEvents';
import { useListings } from './useListings';
import { usePersistedCollapse } from './usePersistedCollapse';
import { useUserLocation } from './useUserLocation';
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
import { OFFER_FEED_FILTER, type CommunityFeedFilter, type CommunityPost, type CommunityPostType } from '@/types';
import { Toast } from '@/utils';

type FeedScope = 'todos' | 'seguindo';

const POSTS_STALE_TIME = 30_000;
const FOLLOWING_IDS_STALE_TIME = 5 * 60_000;
const EVENTS_COLLAPSED_KEY = 'broto:community-events-collapsed';
const OFFERS_COLLAPSED_KEY = 'broto:community-offers-collapsed';

type PostsQueryData = CommunityPostsQueryData;

function replaceFirstPagePost(old: PostsQueryData | undefined, post: CommunityPost): PostsQueryData | undefined {
  if (!old) return old;
  const [firstPage, ...restPages] = old.pages;
  return { ...old, pages: [{ ...firstPage, posts: [post, ...firstPage.posts] }, ...restPages] };
}

export function useCommunityFeed() {
  const router = useRouter();
  const { user } = useAuth();
  const { events: upcomingEvents } = useEvents();
  const { listings } = useListings();
  const userLocation = useUserLocation();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<CommunityFeedFilter | null>(null);
  const [scope, setScope] = useState<FeedScope>('todos');
  const { isCollapsed: isEventsCollapsed, toggleCollapsed: handleToggleEventsCollapsed } =
    usePersistedCollapse(EVENTS_COLLAPSED_KEY);
  const { isCollapsed: isOffersCollapsed, toggleCollapsed: handleToggleOffersCollapsed } =
    usePersistedCollapse(OFFERS_COLLAPSED_KEY);

  const followingIdsQuery = useQuery({
    queryKey: ['following-ids', user?.id],
    queryFn: () => getFollowingIds(user!.id),
    enabled: !!user?.id && scope === 'seguindo',
    staleTime: FOLLOWING_IDS_STALE_TIME,
  });

  const followedAuthorIds = followingIdsQuery.data ?? null;

  const queryKey = useMemo(() => ['community-posts', scope, filter, user?.id] as const, [scope, filter, user?.id]);

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

  const postMatchesCurrentFeed = (newPost: CommunityPost) => {
    if (scope !== 'todos') return false;
    if (!filter) return true;
    if (filter === OFFER_FEED_FILTER) return !!newPost.listingId;
    return newPost.postType === filter;
  };

  const handleCreatePost = async (text: string, imageUris: string[], postType: CommunityPostType | null) => {
    if (!user?.id) return;
    try {
      const newPostId = await createPost(user.id, text, imageUris, postType);
      const newPost = await getPostById(newPostId, user.id);
      if (newPost && postMatchesCurrentFeed(newPost)) {
        queryClient.setQueryData<PostsQueryData>(queryKey, (old) => replaceFirstPagePost(old, newPost));
      }
    } catch (err) {
      console.error(err);
      Toast.error('Não foi possível publicar. Tente novamente.');
      throw err;
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

  const handleDeletePost = useCallback(
    async (postId: string) => {
      const cached = queryClient.getQueryData<PostsQueryData>(queryKey);
      const previousPost = cached?.pages.flatMap((page) => page.posts).find((p) => p.id === postId);
      removePostFromAllFeeds(queryClient, postId);
      try {
        await deletePost(postId);
      } catch {
        if (previousPost) {
          queryClient.setQueryData<PostsQueryData>(queryKey, (old) => replaceFirstPagePost(old, previousPost));
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

  return {
    user,
    upcomingEvents,
    listings,
    userLocation,
    posts,
    isInitialLoading,
    refreshing,
    postsQuery,
    filter,
    setFilter,
    scope,
    setScope,
    isEventsCollapsed,
    handleToggleEventsCollapsed,
    isOffersCollapsed,
    handleToggleOffersCollapsed,
    handleRefresh,
    handleLoadMore,
    handleToggleLike,
    handleAddComment,
    handleCreatePost,
    handlePressAuthor,
    handlePressListing,
    handlePressEvent,
    handleDeletePost,
    handleDeleteComment,
  };
}
