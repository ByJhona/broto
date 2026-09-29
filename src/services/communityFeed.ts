import type { QueryKey } from '@tanstack/react-query';
import { FOLLOWING_FEED_FILTER, OFFER_FEED_FILTER, type CommunityFeedFilter, type CommunityPost } from '@/types';

export const FEATURED_POST_INTERVAL = 5;

export type FeedCandidate = Pick<CommunityPost, 'authorId' | 'postType' | 'listingId'>;

export function communityFeedQueryKey(filter: CommunityFeedFilter | null, userId: string | undefined) {
  return ['community-posts', 'feed', filter, userId] as const;
}

export function authorPostsQueryKey(authorId: string | undefined, userId: string | undefined) {
  return ['community-posts', 'author', authorId, userId] as const;
}

export function postMatchesFeed(
  post: FeedCandidate,
  filter: CommunityFeedFilter | null,
  followedAuthorIds: string[] | null
): boolean {
  if (!filter) return true;
  if (filter === FOLLOWING_FEED_FILTER) return !!followedAuthorIds?.includes(post.authorId);
  if (filter === OFFER_FEED_FILTER) return post.listingId !== null;
  return post.postType === filter;
}

export function feedAcceptsNewPost(queryKey: QueryKey, post: FeedCandidate): boolean {
  const [, kind, target] = queryKey;
  if (kind === 'author') return target === post.authorId;
  return kind === 'feed' && postMatchesFeed(post, target as CommunityFeedFilter | null, null);
}

export function interleaveFeaturedPosts(
  posts: CommunityPost[],
  featured: CommunityPost[],
  isFeedComplete: boolean
): CommunityPost[] {
  const featuredIds = new Set(featured.map((post) => post.id));
  const regular = posts.filter((post) => !featuredIds.has(post.id));
  const mixed = regular.flatMap((post, index) => {
    const featuredPost = index % FEATURED_POST_INTERVAL === 0 ? featured[index / FEATURED_POST_INTERVAL] : undefined;
    return featuredPost ? [featuredPost, post] : [post];
  });
  if (!isFeedComplete) return mixed;
  return [...mixed, ...featured.slice(Math.ceil(regular.length / FEATURED_POST_INTERVAL))];
}
