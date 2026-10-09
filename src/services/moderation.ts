import { supabase } from './supabase';
import type { BlockedUser, ContentReportReason, ContentReportTarget, ContentReportTargetType } from '@/types';

const UNIQUE_VIOLATION = '23505';

const REPORT_COLUMNS: Record<ContentReportTargetType, string> = {
  post: 'post_id',
  comment: 'comment_id',
  listing: 'listing_id',
  event: 'event_id',
  message: 'message_id',
  user: 'reported_user_id',
};

export const BLOCKED_USERS_QUERY_KEY = ['blocked-users'] as const;

export async function reportContent(target: ContentReportTarget, reason: ContentReportReason): Promise<void> {
  const { error } = await supabase.from('content_reports').insert({ [REPORT_COLUMNS[target.type]]: target.id, reason });
  if (error?.code === UNIQUE_VIOLATION) return;
  if (error) throw error;
}

export async function blockUser(userId: string): Promise<void> {
  const { error } = await supabase.from('user_blocks').insert({ blocked_id: userId });
  if (error?.code === UNIQUE_VIOLATION) return;
  if (error) throw error;
}

export async function unblockUser(userId: string): Promise<void> {
  const { error } = await supabase.from('user_blocks').delete().eq('blocked_id', userId);
  if (error) throw error;
}

export async function getBlockedUsers(): Promise<BlockedUser[]> {
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocked_at:created_at, profile:profiles!user_blocks_blocked_id_fkey(id, name, username, avatar_url)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as unknown as BlockedUser[];
}

export async function acceptTerms(userId: string): Promise<string> {
  const acceptedAt = new Date().toISOString();
  const { error } = await supabase.from('profiles').update({ terms_accepted_at: acceptedAt }).eq('id', userId);
  if (error) throw error;
  return acceptedAt;
}
