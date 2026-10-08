import type { QueryKey } from '@tanstack/react-query';
import {
  FOLLOWING_FEED_FILTER,
  OFFER_FEED_FILTER,
  type CommunityContentFilter,
  type CommunityFeedFilter,
  type CommunityPost,
} from '@/types';

export const FEATURED_POST_INTERVAL = 5;

export type FeedCandidate = Pick<CommunityPost, 'authorId' | 'postType' | 'listingId'>;

export function communityFeedQueryKey(filters: CommunityFeedFilter[], userId: string | undefined) {
  return ['community-posts', 'feed', [...filters].sort(), userId] as const;
}

export function authorPostsQueryKey(authorId: string | undefined, userId: string | undefined) {
  return ['community-posts', 'author', authorId, userId] as const;
}

export function contentFilters(filters: CommunityFeedFilter[]): CommunityContentFilter[] {
  return filters.filter((filter): filter is CommunityContentFilter => filter !== FOLLOWING_FEED_FILTER);
}

function matchesContent(post: FeedCandidate, filter: CommunityContentFilter): boolean {
  if (filter === OFFER_FEED_FILTER) return post.listingId !== null;
  return post.postType === filter;
}

export function postMatchesFeed(
  post: FeedCandidate,
  filters: CommunityFeedFilter[],
  followedAuthorIds: string[] | null
): boolean {
  if (filters.includes(FOLLOWING_FEED_FILTER) && !followedAuthorIds?.includes(post.authorId)) return false;
  const content = contentFilters(filters);
  return content.length === 0 || content.some((filter) => matchesContent(post, filter));
}

export function feedAcceptsNewPost(queryKey: QueryKey, post: FeedCandidate): boolean {
  const [, kind, target] = queryKey;
  if (kind === 'author') return target === post.authorId;
  return kind === 'feed' && postMatchesFeed(post, target as CommunityFeedFilter[], null);
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
