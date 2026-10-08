import { LISTING_STATUS, LISTING_TYPE, type ListingType, type PlantEvent, type PlantListing } from '@/types';
import { filterMapItems, isEventsOnly, MAP_FILTER_EVENTS } from './mapFilter';

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
const listings = [
  listing('donation', LISTING_TYPE.DONATION),
  listing('exchange', LISTING_TYPE.EXCHANGE),
  listing('sale', LISTING_TYPE.SALE),
];

describe('filterMapItems', () => {
  it('keeps everything when no filter is selected', () => {
    expect(filterMapItems(listings, [event], [])).toEqual({ listings, events: [event] });
  });

  it('keeps only events for the events filter', () => {
    expect(filterMapItems(listings, [event], [MAP_FILTER_EVENTS])).toEqual({ listings: [], events: [event] });
  });

  it('combines the selected listing types', () => {
    const result = filterMapItems(listings, [event], [LISTING_TYPE.DONATION, LISTING_TYPE.SALE]);

    expect(result.listings.map((item) => item.id)).toEqual(['donation', 'sale']);
    expect(result.events).toEqual([]);
  });

  it('combines listing types with events', () => {
    const result = filterMapItems(listings, [event], [LISTING_TYPE.EXCHANGE, MAP_FILTER_EVENTS]);

    expect(result.listings.map((item) => item.id)).toEqual(['exchange']);
    expect(result.events).toEqual([event]);
  });
});

describe('isEventsOnly', () => {
  it('is true only when events is the single selected filter', () => {
    expect(isEventsOnly([MAP_FILTER_EVENTS])).toBe(true);
    expect(isEventsOnly([MAP_FILTER_EVENTS, LISTING_TYPE.SALE])).toBe(false);
    expect(isEventsOnly([])).toBe(false);
  });
});
