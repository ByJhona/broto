import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { i18n } from '@/i18n';
import { useAuth } from './useAuth';
import {
  getCommunityPosts,
  getFeaturedPosts,
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
  subscribeToNewPosts,
  boostContent,
  BOOST_DURATION_HOURS,
  type CommunityPostsQueryData,
  type NewPostEvent,
} from '@/services';
import { OFFER_FEED_FILTER, type CommunityFeedFilter, type CommunityPost, type CommunityPostType } from '@/types';
import { Toast } from '@/utils';

export type FeedScope = 'todos' | 'seguindo';

const POSTS_STALE_TIME = 30_000;
const FOLLOWING_IDS_STALE_TIME = 5 * 60_000;

type PostsQueryData = CommunityPostsQueryData;

function replaceFirstPagePost(old: PostsQueryData | undefined, post: CommunityPost): PostsQueryData | undefined {
  if (!old) return old;
  const [firstPage, ...restPages] = old.pages;
  return { ...old, pages: [{ ...firstPage, posts: [post, ...firstPage.posts] }, ...restPages] };
}

function eventMatchesFeed(
  event: NewPostEvent,
  scope: FeedScope,
  filter: CommunityFeedFilter | null,
  followedAuthorIds: string[] | null
): boolean {
  if (scope === 'seguindo') return !!followedAuthorIds?.includes(event.authorId);
  if (!filter) return true;
  if (filter === OFFER_FEED_FILTER) return event.hasListing;
  return event.postType === filter;
}

export function useCommunityFeed() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<CommunityFeedFilter | null>(null);
  const [scope, setScope] = useState<FeedScope>('todos');
  const [newPostsCount, setNewPostsCount] = useState(0);

  const followingIdsQuery = useQuery({
    queryKey: ['following-ids', user?.id],
    queryFn: () => getFollowingIds(user!.id),
    enabled: !!user?.id && scope === 'seguindo',
    staleTime: FOLLOWING_IDS_STALE_TIME,
  });

  const followedAuthorIds = followingIdsQuery.data ?? null;

  const featuredPostsQuery = useQuery({
    queryKey: ['featured-posts', user?.id],
    queryFn: () => getFeaturedPosts(user!.id),
    enabled: !!user?.id,
  });

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

  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToNewPosts((event) => {
      if (event.authorId === user.id) return;
      if (eventMatchesFeed(event, scope, filter, followedAuthorIds)) setNewPostsCount((count) => count + 1);
    });

    return unsubscribe;
  }, [user?.id, scope, filter, followedAuthorIds]);

  const handleSetScope = (nextScope: FeedScope) => {
    setNewPostsCount(0);
    setScope(nextScope);
  };

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
      Toast.error(i18n.t('community:createPostError'));
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
        Toast.error(i18n.t('community:deletePostError'));
      }
    },
    [queryClient, queryKey]
  );

  const handleBoostPost = useCallback(
    async (postId: string) => {
      try {
        const boostedUntil = await boostContent('post', postId);
        updatePostInAllFeeds(queryClient, postId, (post) => ({ ...post, boostedUntil }));
        queryClient.invalidateQueries({ queryKey: ['featured-posts'] });
        Toast.success(i18n.t('community:boostSuccess', { hours: BOOST_DURATION_HOURS }));
      } catch (err) {
        Toast.error(err instanceof Error ? err.message : i18n.t('community:boostError'));
      }
    },
    [queryClient]
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
        Toast.error(i18n.t('community:deleteCommentError'));
      }
    },
    [queryClient, queryKey]
  );

  return {
    user,
    posts,
    featuredPosts: featuredPostsQuery.data ?? [],
    isInitialLoading,
    refreshing,
    postsQuery,
    filter,
    setFilter: handleSetFilter,
    scope,
    setScope: handleSetScope,
    newPostsCount,
    handleShowNewPosts,
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
    handleBoostPost,
  };
}
