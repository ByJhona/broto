import type { CommunityFeedFilter, CommunityPost } from '@/types';
import {
  authorPostsQueryKey,
  communityFeedQueryKey,
  feedAcceptsNewPost,
  interleaveFeaturedPosts,
  postMatchesFeed,
} from './communityFeed';

function makePost(id: string, overrides: Partial<CommunityPost> = {}): CommunityPost {
  return {
    id,
    authorId: 'author',
    authorName: 'Ana',
    authorUsername: null,
    postType: null,
    createdAt: 'agora',
    imageUrls: [],
    caption: '',
    listingId: null,
    listingSummary: null,
    eventId: null,
    eventSummary: null,
    likeCount: 0,
    liked: false,
    comments: [],
    boostedUntil: null,
    ...overrides,
  };
}

const ids = (posts: CommunityPost[]) => posts.map((post) => post.id);

describe('postMatchesFeed', () => {
  it('accepts every post when there is no filter', () => {
    expect(postMatchesFeed(makePost('a'), [], null)).toBe(true);
  });

  it('matches offers by the linked listing', () => {
    expect(postMatchesFeed(makePost('a', { listingId: 'l1' }), ['oferta'], null)).toBe(true);
    expect(postMatchesFeed(makePost('b'), ['oferta'], null)).toBe(false);
  });

  it('matches post types exactly', () => {
    expect(postMatchesFeed(makePost('a', { postType: 'dica' }), ['dica'], null)).toBe(true);
    expect(postMatchesFeed(makePost('b', { postType: 'duvida' }), ['dica'], null)).toBe(false);
  });

  it('matches the following feed only for followed authors', () => {
    expect(postMatchesFeed(makePost('a', { authorId: 'friend' }), ['seguindo'], ['friend'])).toBe(true);
    expect(postMatchesFeed(makePost('b', { authorId: 'stranger' }), ['seguindo'], ['friend'])).toBe(false);
    expect(postMatchesFeed(makePost('c', { authorId: 'friend' }), ['seguindo'], null)).toBe(false);
  });

  it('matches any of the selected content filters', () => {
    const filters: CommunityFeedFilter[] = ['dica', 'oferta'];
    expect(postMatchesFeed(makePost('a', { postType: 'dica' }), filters, null)).toBe(true);
    expect(postMatchesFeed(makePost('b', { listingId: 'l1' }), filters, null)).toBe(true);
    expect(postMatchesFeed(makePost('c', { postType: 'duvida' }), filters, null)).toBe(false);
  });

  it('restricts selected content filters to followed authors', () => {
    const filters: CommunityFeedFilter[] = ['seguindo', 'dica'];
    expect(postMatchesFeed(makePost('a', { authorId: 'friend', postType: 'dica' }), filters, ['friend'])).toBe(true);
    expect(postMatchesFeed(makePost('b', { authorId: 'friend', postType: 'duvida' }), filters, ['friend'])).toBe(false);
    expect(postMatchesFeed(makePost('c', { authorId: 'stranger', postType: 'dica' }), filters, ['friend'])).toBe(false);
  });
});

describe('feedAcceptsNewPost', () => {
  const tip = makePost('a', { authorId: 'me', postType: 'dica' });

  it('adds a new post to the author feed of its author', () => {
    expect(feedAcceptsNewPost(authorPostsQueryKey('me', 'me'), tip)).toBe(true);
    expect(feedAcceptsNewPost(authorPostsQueryKey('other', 'me'), tip)).toBe(false);
  });

  it('adds a new post to the community feeds it matches', () => {
    expect(feedAcceptsNewPost(communityFeedQueryKey([], 'me'), tip)).toBe(true);
    expect(feedAcceptsNewPost(communityFeedQueryKey(['dica'], 'me'), tip)).toBe(true);
    expect(feedAcceptsNewPost(communityFeedQueryKey(['duvida'], 'me'), tip)).toBe(false);
    expect(feedAcceptsNewPost(communityFeedQueryKey(['seguindo'], 'me'), tip)).toBe(false);
    expect(feedAcceptsNewPost(communityFeedQueryKey(['duvida', 'dica'], 'me'), tip)).toBe(true);
  });
});

describe('interleaveFeaturedPosts', () => {
  const regular = ['1', '2', '3', '4', '5', '6', '7'].map((id) => makePost(id));
  const featured = [makePost('f1'), makePost('f2'), makePost('f3')];

  it('places one featured post at the top and then one every few posts', () => {
    expect(ids(interleaveFeaturedPosts(regular, featured, false))).toEqual([
      'f1', '1', '2', '3', '4', '5', 'f2', '6', '7',
    ]);
  });

  it('appends the featured posts left over once the feed has no more pages', () => {
    expect(ids(interleaveFeaturedPosts(regular, featured, true))).toEqual([
      'f1', '1', '2', '3', '4', '5', 'f2', '6', '7', 'f3',
    ]);
  });

  it('never repeats a featured post that also shows up in the regular feed', () => {
    const withBoosted = [makePost('1'), makePost('f1'), makePost('2')];
    expect(ids(interleaveFeaturedPosts(withBoosted, [makePost('f1')], true))).toEqual(['f1', '1', '2']);
  });

  it('shows only featured posts when the regular feed is empty', () => {
    expect(ids(interleaveFeaturedPosts([], featured, true))).toEqual(['f1', 'f2', 'f3']);
    expect(interleaveFeaturedPosts([], featured, false)).toEqual([]);
  });
});
