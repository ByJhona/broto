import { mergeProposal } from './listingProposals';
import { OFFER_STATUS } from '@/types';
import type { Proposal } from '@/types';

function makeProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    id: '1',
    listingId: 'listing-1',
    listingTitle: 'Costela-de-adão',
    listingPhotoUrl: 'https://example.com/listing.jpg',
    senderId: 'sender-1',
    recipientId: 'recipient-1',
    proposalType: 'offer',
    offeredPlantId: 'plant-1',
    offeredPlantName: 'Jiboia',
    offeredPlantPhotoUrl: 'https://example.com/photo.jpg',
    status: OFFER_STATUS.PENDING,
    createdAt: '2026-01-01T00:00:00.000Z',
    respondedAt: null,
    ...overrides,
  };
}

describe('mergeProposal', () => {
  it('keeps the fresh join data when the incoming proposal already has it', () => {
    const existing = makeProposal({ status: OFFER_STATUS.PENDING });
    const incoming = makeProposal({
      status: OFFER_STATUS.ACCEPTED,
      listingTitle: 'Costela-de-adão',
      offeredPlantName: 'Jiboia',
    });

    const result = mergeProposal(existing, incoming);

    expect(result.status).toBe(OFFER_STATUS.ACCEPTED);
    expect(result.listingTitle).toBe('Costela-de-adão');
    expect(result.offeredPlantName).toBe('Jiboia');
  });

  it('falls back to the cached join data when the incoming payload lacks it', () => {
    const existing = makeProposal();
    const incoming = makeProposal({
      status: OFFER_STATUS.ACCEPTED,
      listingTitle: null,
      offeredPlantName: null,
      offeredPlantPhotoUrl: null,
    });

    const result = mergeProposal(existing, incoming);

    expect(result.status).toBe(OFFER_STATUS.ACCEPTED);
    expect(result.listingTitle).toBe(existing.listingTitle);
    expect(result.offeredPlantName).toBe(existing.offeredPlantName);
    expect(result.offeredPlantPhotoUrl).toBe(existing.offeredPlantPhotoUrl);
  });
});
