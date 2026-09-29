import type { ListingStatus, ListingType } from './plant-listing';

export const COMMUNITY_POST_TYPE = {
  CONQUISTA: 'conquista',
  DUVIDA: 'duvida',
  DICA: 'dica',
} as const;

export type CommunityPostType = (typeof COMMUNITY_POST_TYPE)[keyof typeof COMMUNITY_POST_TYPE];

export const OFFER_FEED_FILTER = 'oferta' as const;
export const FOLLOWING_FEED_FILTER = 'seguindo' as const;
export type CommunityContentFilter = CommunityPostType | typeof OFFER_FEED_FILTER;
export type CommunityFeedFilter = CommunityContentFilter | typeof FOLLOWING_FEED_FILTER;

export const CONTENT_REPORT_REASONS = ['spam', 'inappropriate', 'scam', 'other'] as const;
export type ContentReportReason = (typeof CONTENT_REPORT_REASONS)[number];
export type ContentReportTarget = { type: 'post' | 'comment'; id: string };

export type CommunityComment = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  text: string | null;
  photoUrl: string | null;
  createdAt: string;
};

export type CommunityPostListingSummary = {
  id: string;
  title: string;
  photoUrl: string | null;
  listingType: ListingType;
  priceCents: number | null;
  status: ListingStatus;
};

export type CommunityPostEventSummary = {
  id: string;
  title: string;
  photoUrl: string | null;
  eventDate: string;
};

export type CommunityPost = {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string | null;
  authorAvatarUrl?: string | null;
  postType: CommunityPostType | null;
  createdAt: string;
  imageUrls: string[];
  caption: string;
  listingId: string | null;
  listingSummary: CommunityPostListingSummary | null;
  eventId: string | null;
  eventSummary: CommunityPostEventSummary | null;
  likeCount: number;
  liked: boolean;
  comments: CommunityComment[];
  boostedUntil: string | null;
};
