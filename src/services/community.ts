import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { PHOTO_UPLOAD_MAX_WIDTH, resizeImageForUpload } from './imageResize';
import type { CommunityPost, CommunityPostType } from '@/types';

const PAGE_SIZE = 10;

const POST_SELECT = `
  *,
  profiles!posts_user_id_fkey (name, username, avatar_url),
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

  if (diffInSeconds < 60) return 'agora';

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `há ${diffInMinutes} min`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `há ${diffInHours} h`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'ontem';
  if (diffInDays < 7) return `há ${diffInDays} dias`;

  return date.toLocaleDateString('pt-BR');
}

type PostRow = {
  id: string;
  user_id: string;
  image_url: string | null;
  caption: string;
  post_type: CommunityPostType | null;
  created_at: string;
  profiles: {
    name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
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
    imageUrl: row.image_url,
    caption: row.caption,
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
  postType: CommunityPostType | null = null,
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

  if (postType) {
    query = query.eq('post_type', postType);
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

export async function createPost(
  userId: string,
  caption: string,
  localUri: string | null,
  postType: CommunityPostType | null
): Promise<string> {
  let imageUrl: string | null = null;

  if (localUri) {
    const { File } = await import('expo-file-system');
    const { decode } = await import('base64-arraybuffer');

    const resizedUri = await resizeImageForUpload(localUri, PHOTO_UPLOAD_MAX_WIDTH);
    const file = new File(resizedUri);
    const base64 = await file.base64();
    const filename = `${userId}/${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('posts')
      .upload(filename, decode(base64), { contentType: 'image/jpeg' });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('posts').getPublicUrl(filename);
    imageUrl = data.publicUrl;
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({ user_id: userId, caption, image_url: imageUrl, post_type: postType })
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

export function removeCommentFromAllFeeds(queryClient: QueryClient, commentId: string) {
  queryClient.setQueriesData<CommunityPostsQueryData>({ queryKey: COMMUNITY_POSTS_QUERY_PREFIX }, (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        posts: page.posts.map((post) => ({ ...post, comments: post.comments.filter((c) => c.id !== commentId) })),
      })),
    };
  });
}
