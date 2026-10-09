import { parseArticleBody, readingMinutes, slugify } from './articleBody';
import { supabase } from './supabase';
import type { AppRole, ContentReport, ContentType, ModerationAction, Penalty, PenaltyKind, Profile, ReportStatus, UserRole } from './types';

const PROFILE_FIELDS = 'id, name, username, avatar_url';
const PAGE_SIZE = 100;

const REPORT_FIELDS = `
  id, reason, status, created_at, resolved_at, post_id, comment_id, listing_id, event_id, message_id, reported_user_id,
  reporter:profiles!content_reports_reporter_id_fkey(${PROFILE_FIELDS}),
  post:posts(id, caption, image_urls, created_at, deleted_at, author:profiles!posts_user_id_fkey(${PROFILE_FIELDS})),
  comment:post_comments(id, text, photo_url, created_at, deleted_at, author:profiles!post_comments_user_id_fkey(${PROFILE_FIELDS})),
  listing:plant_listings(id, title, description, photo_urls, created_at, deleted_at, author:profiles!plant_listings_user_id_fkey(${PROFILE_FIELDS})),
  event:events(id, title, description, photo_url, created_at, deleted_at, author:profiles!events_user_id_fkey(${PROFILE_FIELDS})),
  message:chat_messages(id, body, photo_url, created_at, author:profiles!plant_listing_messages_sender_id_fkey(${PROFILE_FIELDS})),
  reported_user:profiles!content_reports_reported_user_id_fkey(${PROFILE_FIELDS})
`;

const PENALTY_FIELDS = 'id, user_id, kind, reason, ends_at, created_by, created_at, revoked_at';

export type ReportFilter = 'open' | 'resolved';

export type PenaltyInput = {
  userId: string;
  kind: PenaltyKind;
  days: number | null;
  reason: string | null;
  reportIds: string[];
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
    .order('created_at', { ascending: false })
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

export async function resolveReports(reportIds: string[], status: Exclude<ReportStatus, 'open'>): Promise<void> {
  const { error } = await supabase.rpc('resolve_content_reports', { p_report_ids: reportIds, p_status: status });
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

export async function getPenalties(userIds: string[]): Promise<Penalty[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await supabase
    .from('user_penalties')
    .select(PENALTY_FIELDS)
    .in('user_id', [...new Set(userIds)])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Penalty[];
}

export async function getActivePenalties(): Promise<Penalty[]> {
  const { data, error } = await supabase
    .from('user_penalties')
    .select(PENALTY_FIELDS)
    .neq('kind', 'warning')
    .is('revoked_at', null)
    .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);
  if (error) throw error;
  return data as Penalty[];
}

async function syncUserBan(userId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('sync-user-ban', { body: { userId } });
  if (error) throw error;
}

export async function applyPenalty({ userId, kind, days, reason, reportIds }: PenaltyInput): Promise<void> {
  const { error } = await supabase.rpc('apply_penalty', {
    p_user_id: userId,
    p_kind: kind,
    p_days: days,
    p_reason: reason,
    p_report_ids: reportIds.length > 0 ? reportIds : null,
  });
  if (error) throw error;
  if (kind === 'suspension' || kind === 'ban') await syncUserBan(userId);
}

export async function revokePenalty(penalty: Penalty): Promise<void> {
  const { error } = await supabase.rpc('revoke_penalty', { p_penalty_id: penalty.id });
  if (error) throw error;
  if (penalty.kind === 'suspension' || penalty.kind === 'ban') await syncUserBan(penalty.user_id);
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

export type ArticleLocale = 'pt' | 'en';

export type ArticleInput = {
  locale: ArticleLocale;
  category: string;
  title: string;
  dek: string;
  body: string;
  cover: File | null;
  isFeatured: boolean;
};

export async function getArticleCategories(locale: ArticleLocale): Promise<string[]> {
  const { data, error } = await supabase.from('articles').select('category').eq('locale', locale);
  if (error) throw error;
  return [...new Set(data.map((row) => row.category))].sort();
}

async function uploadArticleCover(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from('article-covers').upload(path, file, { contentType: file.type });
  if (error) throw error;
  return supabase.storage.from('article-covers').getPublicUrl(path).data.publicUrl;
}

export async function createArticle(input: ArticleInput): Promise<void> {
  const coverUrl = input.cover ? await uploadArticleCover(input.cover) : null;
  const { error } = await supabase.from('articles').insert({
    locale: input.locale,
    slug: slugify(input.title),
    category: input.category,
    title: input.title,
    dek: input.dek,
    cover_url: coverUrl,
    reading_minutes: readingMinutes(input.body),
    body: parseArticleBody(input.body),
    is_featured: input.isFeatured,
    published_at: new Date().toISOString(),
  });
  if (error) throw error;
}
