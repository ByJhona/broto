import type { ListingStatus, ListingType } from './plant-listing';

export type CommunityPostType = 'conquista' | 'duvida' | 'dica';
export type CommunityFeedFilter = CommunityPostType | 'oferta';

export type CommunityComment = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  text: string;
  createdAt: string;
};

export type CommunityPostListingSummary = {
  id: string;
  title: string;
  photoUrl: string | null;
  listingType: ListingType;
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
  imageUrl: string | null;
  caption: string;
  listingId: string | null;
  listingSummary: CommunityPostListingSummary | null;
  eventId: string | null;
  eventSummary: CommunityPostEventSummary | null;
  likeCount: number;
  liked: boolean;
  comments: CommunityComment[];
};
