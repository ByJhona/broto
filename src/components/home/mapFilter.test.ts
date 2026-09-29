import { LISTING_STATUS, LISTING_TYPE, type ListingType, type PlantEvent, type PlantListing } from '@/types';
import { filterMapItems, MAP_FILTER_ALL, MAP_FILTER_EVENTS } from './mapFilter';

function listing(id: string, listingType: ListingType): PlantListing {
  return {
    id,
    userId: 'owner',
    plantId: null,
    listingType,
    title: id,
    description: null,
    photoUrls: [],
    priceCents: null,
    latitude: 0,
    longitude: 0,
    status: LISTING_STATUS.AVAILABLE,
    createdAt: '2026-09-01T00:00:00.000Z',
    ownerName: null,
    ownerAvatarUrl: null,
    boostedUntil: null,
  };
}

const event = { id: 'event' } as PlantEvent;
const listings = [listing('donation', LISTING_TYPE.DONATION), listing('sale', LISTING_TYPE.SALE)];

describe('filterMapItems', () => {
  it('keeps everything for the all filter', () => {
    expect(filterMapItems(listings, [event], MAP_FILTER_ALL)).toEqual({ listings, events: [event] });
  });

  it('keeps only events for the events filter', () => {
    expect(filterMapItems(listings, [event], MAP_FILTER_EVENTS)).toEqual({ listings: [], events: [event] });
  });

  it('keeps only listings of the chosen type', () => {
    const result = filterMapItems(listings, [event], LISTING_TYPE.SALE);

    expect(result.listings.map((item) => item.id)).toEqual(['sale']);
    expect(result.events).toEqual([]);
  });
});
