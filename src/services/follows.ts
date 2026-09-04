import { supabase } from './supabase';
import type { FollowCounts } from '@/types';

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .match({ follower_id: followerId, following_id: followingId })
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

export async function followUser(followerId: string, followingId: string): Promise<void> {
  const { error } = await supabase.from('follows').insert({ follower_id: followerId, following_id: followingId });
  if (error) throw error;
}

export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  const { error } = await supabase.from('follows').delete().match({ follower_id: followerId, following_id: followingId });
  if (error) throw error;
}

export async function getFollowCounts(userId: string): Promise<FollowCounts> {
  const [followers, following] = await Promise.all([
    supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', userId),
  ]);

  if (followers.error) throw followers.error;
  if (following.error) throw following.error;

  return { followers: followers.count ?? 0, following: following.count ?? 0 };
}

export async function getFollowingIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase.from('follows').select('following_id').eq('follower_id', userId);
  if (error) throw error;
  return data.map((row) => row.following_id);
}
