export type NotificationType = 'system' | 'like' | 'comment';

export type Notification = {
  id: string;
  type: NotificationType;
  actorName: string | null;
  postId: string | null;
  title: string | null;
  message: string | null;
  createdAt: string;
};
