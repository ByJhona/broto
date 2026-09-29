export const NOTIFICATION_TYPES = [
  'system',
  'like',
  'comment',
  'listing_interest',
  'care_setup_reminder',
  'care_reminder',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type Notification = {
  id: string;
  type: NotificationType;
  actorId: string | null;
  actorName: string | null;
  actorAvatarUrl: string | null;
  postId: string | null;
  listingId: string | null;
  plantId: string | null;
  plantName: string | null;
  previewPhotoUrl: string | null;
  title: string | null;
  message: string | null;
  createdAt: string;
};
