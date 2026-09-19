export type NotificationType =
  | 'system'
  | 'like'
  | 'comment'
  | 'listing_interest'
  | 'listing_message'
  | 'care_setup_reminder'
  | 'care_reminder';

export type Notification = {
  id: string;
  type: NotificationType;
  actorId: string | null;
  actorName: string | null;
  postId: string | null;
  listingId: string | null;
  plantId: string | null;
  plantName: string | null;
  title: string | null;
  message: string | null;
  createdAt: string;
};
