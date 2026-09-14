import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import { i18n } from '@/i18n';
import { supabase } from './supabase';
import { PHOTO_UPLOAD_MAX_WIDTH, resizeImageForUpload } from './imageResize';
import { uniquePhotoFilename } from './storagePath';
import { OFFER_FEED_FILTER, type CommunityFeedFilter, type CommunityPost, type CommunityPostType, type ListingStatus, type ListingType } from '@/types';

const PAGE_SIZE = 10;
export const MAX_POST_PHOTOS = 5;

const POST_SELECT = `
  *,
  profiles!posts_user_id_fkey (name, username, avatar_url),
  listing:plant_listings!listing_id (id, title, photo_urls, listing_type, price_cents, status),
  event:events!event_id (id, title, photo_url, event_date),
  post_likes!post_likes_post_id_fkey (count),
  likedByUser:post_likes!post_likes_post_id_fkey (count),
  post_comments!post_comments_post_id_fkey (
    id, text, created_at, user_id,
    profiles!post_comments_user_id_fkey (name, username, avatar_url)
  )
`;

export type CommunityFeedPage = {
  posts: CommunityPost[];
  nextCursor: string | null;
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return i18n.t('community:justNow');

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return i18n.t('community:minutesAgo', { count: diffInMinutes });

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return i18n.t('community:hoursAgo', { count: diffInHours });

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return i18n.t('community:yesterday');
  if (diffInDays < 7) return i18n.t('community:daysAgo', { count: diffInDays });

  return date.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'pt-BR');
}

type PostRow = {
  id: string;
  user_id: string;
  image_urls: string[];
  caption: string;
  post_type: CommunityPostType | null;
  listing_id: string | null;
  event_id: string | null;
  created_at: string;
  profiles: {
    name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  listing: {
    id: string;
    title: string;
    photo_urls: string[];
    listing_type: ListingType;
    price_cents: number | null;
    status: ListingStatus;
  } | null;
  event: {
    id: string;
    title: string;
    photo_url: string | null;
    event_date: string;
  } | null;
  post_likes: { count: number }[];
  likedByUser: { count: number }[];
  post_comments: {
    id: string;
    text: string;
    created_at: string;
    user_id: string;
    profiles: {
      name: string | null;
      username: string | null;
      avatar_url: string | null;
    };
  }[];
};

function formatPost(row: PostRow): CommunityPost {
  const authorName = row.profiles?.name || row.profiles?.username || 'Jardineiro';

  return {
    id: row.id,
    authorId: row.user_id,
    authorName,
    authorUsername: row.profiles?.username ?? null,
    authorAvatarUrl: row.profiles?.avatar_url,
    postType: row.post_type,
    createdAt: formatRelativeTime(row.created_at),
    imageUrls: row.image_urls,
    caption: row.caption,
    listingId: row.listing_id,
    listingSummary: row.listing
      ? {
          id: row.listing.id,
          title: row.listing.title,
          photoUrl: row.listing.photo_urls?.[0] ?? null,
          listingType: row.listing.listing_type,
          priceCents: row.listing.price_cents,
          status: row.listing.status,
        }
      : null,
    eventId: row.event_id,
    eventSummary: row.event
      ? {
          id: row.event.id,
          title: row.event.title,
          photoUrl: row.event.photo_url,
          eventDate: row.event.event_date,
        }
      : null,
    likeCount: row.post_likes?.[0]?.count || 0,
    liked: (row.likedByUser?.[0]?.count || 0) > 0,
    comments: (row.post_comments || [])
      .slice()
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map(comment => ({
        id: comment.id,
        authorId: comment.user_id,
        text: comment.text,
        createdAt: formatRelativeTime(comment.created_at),
        authorName: comment.profiles?.name || comment.profiles?.username || 'Jardineiro',
        authorAvatarUrl: comment.profiles?.avatar_url,
      })),
  };
}

export async function getCommunityPosts(
  userId: string,
  cursor: string | null = null,
  filter: CommunityFeedFilter | null = null,
  authorIds: string[] | null = null
): Promise<CommunityFeedPage> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!userId || !uuidRegex.test(String(userId))) {
    return { posts: [], nextCursor: null };
  }

  if (authorIds && authorIds.length === 0) {
    return { posts: [], nextCursor: null };
  }

  let query = supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('likedByUser.user_id', userId)
    .is('deleted_at', null)
    .is('post_comments.deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  if (filter === OFFER_FEED_FILTER) {
    query = query.not('listing_id', 'is', null);
  } else if (filter) {
    query = query.eq('post_type', filter);
  }

  if (authorIds) {
    query = query.in('user_id', authorIds);
  }

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching posts:', error);
    throw error;
  }

  const rows = data as unknown as PostRow[];
  const posts = rows.map(formatPost);
  const nextCursor = rows.length === PAGE_SIZE ? rows[rows.length - 1].created_at : null;

  return { posts, nextCursor };
}

export async function getPostById(postId: string, userId: string): Promise<CommunityPost | null> {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('likedByUser.user_id', userId)
    .is('deleted_at', null)
    .is('post_comments.deleted_at', null)
    .eq('id', postId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching post:', error);
    return null;
  }

  return data ? formatPost(data as unknown as PostRow) : null;
}

async function uploadPostPhoto(userId: string, localUri: string): Promise<string> {
  const { File } = await import('expo-file-system');

  const resizedUri = await resizeImageForUpload(localUri, PHOTO_UPLOAD_MAX_WIDTH);
  const file = new File(resizedUri);
  const bytes = await file.bytes();
  const filename = `${userId}/${uniquePhotoFilename()}`;

  const { error: uploadError } = await supabase.storage
    .from('posts')
    .upload(filename, bytes, { contentType: 'image/jpeg' });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('posts').getPublicUrl(filename);
  return data.publicUrl;
}

export async function createPost(
  userId: string,
  caption: string,
  localUris: string[],
  postType: CommunityPostType | null,
  existingImageUrls: string[] = [],
  listingId?: string | null,
  eventId?: string | null
): Promise<string> {
  const uploadedImageUrls = await Promise.all(localUris.map((localUri) => uploadPostPhoto(userId, localUri)));
  const imageUrls = [...existingImageUrls, ...uploadedImageUrls];

  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: userId,
      caption,
      image_urls: imageUrls,
      post_type: postType,
      listing_id: listingId ?? null,
      event_id: eventId ?? null,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function toggleLike(postId: string, userId: string, currentlyLiked: boolean): Promise<void> {
  if (currentlyLiked) {
    const { error } = await supabase.from('post_likes').delete().match({ post_id: postId, user_id: userId });
    if (error) throw error;
  } else {
    const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
    if (error) throw error;
  }
}

export async function addComment(postId: string, userId: string, text: string): Promise<void> {
  const { error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, user_id: userId, text });

  if (error) throw error;
}

export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase.from('posts').update({ deleted_at: new Date().toISOString() }).eq('id', postId);
  if (error) throw error;
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('post_comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', commentId);
  if (error) throw error;
}

export type CommunityPostsQueryData = InfiniteData<CommunityFeedPage>;

// Broad-matches every cached feed (main community feed, per-profile feeds, ...) that
// starts with this key, so an edit made from any screen stays in sync everywhere.
const COMMUNITY_POSTS_QUERY_PREFIX = ['community-posts'] as const;

export function updatePostInAllFeeds(
  queryClient: QueryClient,
  postId: string,
  updater: (post: CommunityPost) => CommunityPost
) {
  queryClient.setQueriesData<CommunityPostsQueryData>({ queryKey: COMMUNITY_POSTS_QUERY_PREFIX }, (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        posts: page.posts.map((post) => (post.id === postId ? updater(post) : post)),
      })),
    };
  });
}

export function removePostFromAllFeeds(queryClient: QueryClient, postId: string) {
  queryClient.setQueriesData<CommunityPostsQueryData>({ queryKey: COMMUNITY_POSTS_QUERY_PREFIX }, (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({ ...page, posts: page.posts.filter((post) => post.id !== postId) })),
    };
  });
}

function withoutComment(post: CommunityPost, commentId: string): CommunityPost {
  return { ...post, comments: post.comments.filter((comment) => comment.id !== commentId) };
}

export function removeCommentFromAllFeeds(queryClient: QueryClient, commentId: string) {
  queryClient.setQueriesData<CommunityPostsQueryData>({ queryKey: COMMUNITY_POSTS_QUERY_PREFIX }, (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        posts: page.posts.map((post) => withoutComment(post, commentId)),
      })),
    };
  });
}
