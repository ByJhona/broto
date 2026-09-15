import type { OfferStatus } from './chat';

export type ProposalType = 'offer' | 'interest';

export type Proposal = {
  id: string;
  listingId: string;
  listingTitle: string | null;
  senderId: string;
  recipientId: string;
  proposalType: ProposalType;
  offeredPlantId: string | null;
  offeredPlantName: string | null;
  offeredPlantPhotoUrl: string | null;
  status: OfferStatus;
  createdAt: string;
  respondedAt: string | null;
};
