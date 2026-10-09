import type { ContentReport, ContentType, Penalty, PenaltyKind, Profile, ReportReason, ReportTargetType } from './types';

export type ReportedContent = {
  type: ReportTargetType;
  id: string;
  author: Profile | null;
  title: string | null;
  text: string | null;
  images: string[];
  createdAt: string | null;
  isHidden: boolean;
};

export type ReportGroup = {
  key: string;
  content: ReportedContent | null;
  reports: ContentReport[];
  reasonCounts: [ReportReason, number][];
  latestAt: string;
};

export type PenaltySuggestion = { kind: PenaltyKind; days: number | null };

const SUGGESTION_LADDER: PenaltySuggestion[] = [
  { kind: 'warning', days: null },
  { kind: 'restriction', days: 7 },
  { kind: 'suspension', days: 7 },
  { kind: 'suspension', days: 30 },
  { kind: 'ban', days: null },
];

const HIDEABLE_TYPES: ReportTargetType[] = ['post', 'comment', 'listing', 'event'];

function postContent(report: ContentReport): ReportedContent | null {
  if (!report.post) return null;
  const { id, author, caption, image_urls, created_at, deleted_at } = report.post;
  return { type: 'post', id, author, title: null, text: caption, images: image_urls, createdAt: created_at, isHidden: deleted_at !== null };
}

function commentContent(report: ContentReport): ReportedContent | null {
  if (!report.comment) return null;
  const { id, author, text, photo_url, created_at, deleted_at } = report.comment;
  const images = photo_url ? [photo_url] : [];
  return { type: 'comment', id, author, title: null, text, images, createdAt: created_at, isHidden: deleted_at !== null };
}

function listingContent(report: ContentReport): ReportedContent | null {
  if (!report.listing) return null;
  const { id, author, title, description, photo_urls, created_at, deleted_at } = report.listing;
  return { type: 'listing', id, author, title, text: description, images: photo_urls, createdAt: created_at, isHidden: deleted_at !== null };
}

function eventContent(report: ContentReport): ReportedContent | null {
  if (!report.event) return null;
  const { id, author, title, description, photo_url, created_at, deleted_at } = report.event;
  const images = photo_url ? [photo_url] : [];
  return { type: 'event', id, author, title, text: description, images, createdAt: created_at, isHidden: deleted_at !== null };
}

function messageContent(report: ContentReport): ReportedContent | null {
  if (!report.message) return null;
  const { id, author, body, photo_url, created_at } = report.message;
  const images = photo_url ? [photo_url] : [];
  return { type: 'message', id, author, title: null, text: body, images, createdAt: created_at, isHidden: false };
}

function userContent(report: ContentReport): ReportedContent | null {
  if (!report.reported_user) return null;
  return { type: 'user', id: report.reported_user.id, author: report.reported_user, title: null, text: null, images: [], createdAt: null, isHidden: false };
}

const CONTENT_READERS = [postContent, commentContent, listingContent, eventContent, messageContent, userContent];

export function reportedContent(report: ContentReport): ReportedContent | null {
  for (const read of CONTENT_READERS) {
    const content = read(report);
    if (content) return content;
  }
  return null;
}

function targetKey(report: ContentReport): string {
  const ids = [report.post_id, report.comment_id, report.listing_id, report.event_id, report.message_id, report.reported_user_id];
  return ids.find((id) => id !== null) ?? report.id;
}

function countReasons(reports: ContentReport[]): [ReportReason, number][] {
  const counts = new Map<ReportReason, number>();
  reports.forEach((report) => counts.set(report.reason, (counts.get(report.reason) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export function groupReports(reports: ContentReport[]): ReportGroup[] {
  const groups = new Map<string, ContentReport[]>();
  reports.forEach((report) => {
    const key = targetKey(report);
    groups.set(key, [...(groups.get(key) ?? []), report]);
  });
  return [...groups.entries()]
    .map(([key, items]) => ({
      key,
      content: reportedContent(items[0]),
      reports: items,
      reasonCounts: countReasons(items),
      latestAt: items[0].created_at,
    }))
    .sort((a, b) => b.reports.length - a.reports.length || b.latestAt.localeCompare(a.latestAt));
}

export function canHide(content: ReportedContent | null): content is ReportedContent & { type: ContentType } {
  return content !== null && HIDEABLE_TYPES.includes(content.type) && !content.isHidden;
}

export function isActivePenalty(penalty: Penalty, now = Date.now()): boolean {
  if (penalty.revoked_at !== null || penalty.kind === 'warning') return false;
  return penalty.ends_at === null || new Date(penalty.ends_at).getTime() > now;
}

export function activePenalty(penalties: Penalty[]): Penalty | null {
  return penalties.find((penalty) => isActivePenalty(penalty)) ?? null;
}

export function strikeCount(penalties: Penalty[]): number {
  return penalties.filter((penalty) => penalty.revoked_at === null).length;
}

export function suggestPenalty(penalties: Penalty[]): PenaltySuggestion {
  return SUGGESTION_LADDER[Math.min(strikeCount(penalties), SUGGESTION_LADDER.length - 1)];
}

export function penaltiesByUser(penalties: Penalty[]): Map<string, Penalty[]> {
  const byUser = new Map<string, Penalty[]>();
  penalties.forEach((penalty) => byUser.set(penalty.user_id, [...(byUser.get(penalty.user_id) ?? []), penalty]));
  return byUser;
}
