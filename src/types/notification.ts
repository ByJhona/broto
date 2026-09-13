export type NotificationType = 'system' | 'like' | 'comment' | 'listing_interest' | 'listing_message';

export type Notification = {
  id: string;
  type: NotificationType;
  actorId: string | null;
  actorName: string | null;
  postId: string | null;
  listingId: string | null;
  title: string | null;
  message: string | null;
  createdAt: string;
};
