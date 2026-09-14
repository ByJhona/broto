export const OFFER_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
} as const;

export type OfferStatus = (typeof OFFER_STATUS)[keyof typeof OFFER_STATUS];

export type ChatMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
};

export type ChatConversation = {
  otherUserId: string;
  otherUserName: string;
  otherUserAvatarUrl: string | null;
  lastMessagePreview: string;
  lastMessageAt: string;
  hasUnread: boolean;
};
