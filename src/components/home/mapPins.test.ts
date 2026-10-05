import type { PlantEvent, PlantListing } from '@/types';
import { EVENT_COLOR, LISTING_TYPE_COLORS } from '@/utils';
import { isSamePin, mapPins, pinAppearance } from './mapPins';

const listing = { id: 'l1', listingType: 'donation', latitude: 1, longitude: 2, photoUrls: ['a.jpg', 'b.jpg'] } as unknown as PlantListing;
const event = { id: 'e1', latitude: 3, longitude: 4, photoUrl: null } as unknown as PlantEvent;

describe('mapPins', () => {
  it('creates one pin per listing and event', () => {
    expect(mapPins([listing], [event])).toEqual([
      { kind: 'listing', listing },
      { kind: 'event', event },
    ]);
  });
});

describe('pinAppearance', () => {
  it('uses the first listing photo and the listing type color', () => {
    const appearance = pinAppearance({ kind: 'listing', listing });

    expect(appearance).toMatchObject({
      key: 'listing-l1',
      coordinate: { latitude: 1, longitude: 2 },
      color: LISTING_TYPE_COLORS.donation,
      photoUrl: 'a.jpg',
    });
  });

  it('falls back to no photo for events without one', () => {
    expect(pinAppearance({ kind: 'event', event })).toMatchObject({ key: 'event-e1', color: EVENT_COLOR, photoUrl: null });
  });
});

describe('isSamePin', () => {
  it('matches pins by kind and id', () => {
    expect(isSamePin({ kind: 'event', event }, { kind: 'event', event })).toBe(true);
    expect(isSamePin({ kind: 'listing', listing }, { kind: 'event', event })).toBe(false);
    expect(isSamePin(null, { kind: 'event', event })).toBe(false);
  });
});
