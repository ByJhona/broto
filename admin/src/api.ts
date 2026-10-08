import { supabase } from './supabase';
import type {
  AppRole,
  ContentReport,
  ContentType,
  ModerationAction,
  Profile,
  ReportStatus,
  Suspension,
  UserRole,
} from './types';

const PROFILE_FIELDS = 'id, name, username, avatar_url';
const PAGE_SIZE = 100;

const REPORT_FIELDS = `
  id, reason, status, created_at, resolved_at, post_id, comment_id,
  reporter:profiles!content_reports_reporter_id_fkey(${PROFILE_FIELDS}),
  post:posts(id, caption, image_urls, created_at, deleted_at, author:profiles!posts_user_id_fkey(${PROFILE_FIELDS})),
  comment:post_comments(id, text, photo_url, created_at, deleted_at, author:profiles!post_comments_user_id_fkey(${PROFILE_FIELDS}))
`;

export type ReportFilter = 'open' | 'resolved';

export type SuspendInput = {
  userId: string;
  days: number | null;
  reason: string | null;
};

export async function getMyRole(): Promise<AppRole | null> {
  const { data, error } = await supabase.rpc('get_my_role');
  if (error) throw error;
  return data as AppRole | null;
}

export async function getReports(filter: ReportFilter): Promise<ContentReport[]> {
  const statuses: ReportStatus[] = filter === 'open' ? ['open'] : ['dismissed', 'actioned'];
  const { data, error } = await supabase
    .from('content_reports')
    .select(REPORT_FIELDS)
    .in('status', statuses)
    .order('created_at', { ascending: filter === 'open' })
    .limit(PAGE_SIZE);
  if (error) throw error;
  return data as unknown as ContentReport[];
}

export async function hideContent(contentType: ContentType, contentId: string, reason: string | null): Promise<void> {
  const { error } = await supabase.rpc('moderate_hide_content', {
    p_content_type: contentType,
    p_content_id: contentId,
    p_reason: reason,
  });
  if (error) throw error;
}

export async function resolveReport(reportId: string, status: Exclude<ReportStatus, 'open'>): Promise<void> {
  const { error } = await supabase.rpc('resolve_content_report', { p_report_id: reportId, p_status: status });
  if (error) throw error;
}

function searchPattern(term: string): string {
  return `%${term.replace(/[%_,().*\\]/g, ' ').trim()}%`;
}

export async function searchProfiles(term: string): Promise<Profile[]> {
  const pattern = searchPattern(term);
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .or(`username.ilike.${pattern},name.ilike.${pattern}`)
    .order('username')
    .limit(20);
  if (error) throw error;
  return data;
}

export async function getProfiles(ids: string[]): Promise<Map<string, Profile>> {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return new Map();
  const { data, error } = await supabase.from('profiles').select(PROFILE_FIELDS).in('id', uniqueIds);
  if (error) throw error;
  return new Map(data.map((profile) => [profile.id, profile]));
}

export async function getSuspensions(userIds?: string[]): Promise<Map<string, string>> {
  const { data, error } = await supabase.rpc('get_suspensions', { p_user_ids: userIds ?? null });
  if (error) throw error;
  return new Map((data as Suspension[]).map((item) => [item.user_id, item.banned_until]));
}

async function moderateUser(body: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.functions.invoke('moderate-user', { body });
  if (error) throw error;
}

export function suspendUser({ userId, days, reason }: SuspendInput): Promise<void> {
  return moderateUser({ userId, action: 'suspend', days, reason });
}

export function unsuspendUser(userId: string): Promise<void> {
  return moderateUser({ userId, action: 'unsuspend' });
}

export async function getModerationActions(): Promise<ModerationAction[]> {
  const { data, error } = await supabase
    .from('moderation_actions')
    .select('id, moderator_id, action, target_user_id, content_type, reason, details, created_at')
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);
  if (error) throw error;
  return data as ModerationAction[];
}

export async function getUserRoles(): Promise<UserRole[]> {
  const { data, error } = await supabase.from('user_roles').select('user_id, role, granted_at').order('granted_at');
  if (error) throw error;
  return data as UserRole[];
}

export async function setUserRole(userId: string, role: AppRole | null): Promise<void> {
  const { error } = await supabase.rpc('set_user_role', { p_user_id: userId, p_role: role });
  if (error) throw error;
}
