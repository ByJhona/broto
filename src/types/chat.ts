export type OfferStatus = 'pending' | 'accepted' | 'declined';

export type ChatMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  body: string | null;
  messageType: 'text' | 'offer';
  listingId: string | null;
  listingTitle: string | null;
  offeredPlantId: string | null;
  offeredPlantName: string | null;
  offeredPlantPhotoUrl: string | null;
  offerStatus: OfferStatus | null;
  createdAt: string;
};

export type ChatConversation = {
  otherUserId: string;
  otherUserName: string;
  otherUserAvatarUrl: string | null;
  lastMessagePreview: string;
  lastMessageAt: string;
};
