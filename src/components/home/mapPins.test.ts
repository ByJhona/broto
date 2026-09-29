import type { PlantEvent, PlantListing } from '@/types';
import { buildMarkers, findPinForMarker } from './mapPins';

const listing = { id: 'l1', listingType: 'donation', latitude: 1, longitude: 2 } as PlantListing;
const event = { id: 'e1', latitude: 3, longitude: 4 } as PlantEvent;
const iconSet = { default: null, highlighted: null };
const icons = { donation: iconSet, exchange: iconSet, discard: iconSet, sale: iconSet, event: iconSet };

describe('buildMarkers', () => {
  it('creates one marker per listing and event', () => {
    const markers = buildMarkers([listing], [event], icons, null);

    expect(markers.map((marker) => marker.id)).toEqual(['listing-l1', 'event-e1']);
  });

  it('raises only the selected pin above the others', () => {
    const markers = buildMarkers([listing], [event], icons, { kind: 'event', event });

    expect(markers.map((marker) => marker.zIndex)).toEqual([0, 1]);
  });
});

describe('findPinForMarker', () => {
  it('finds the listing behind a listing marker', () => {
    expect(findPinForMarker('listing-l1', [listing], [event])).toEqual({ kind: 'listing', listing });
  });

  it('finds the event behind an event marker', () => {
    expect(findPinForMarker('event-e1', [listing], [event])).toEqual({ kind: 'event', event });
  });

  it('returns null for an unknown or missing marker id', () => {
    expect(findPinForMarker('listing-missing', [listing], [event])).toBeNull();
    expect(findPinForMarker(undefined, [listing], [event])).toBeNull();
  });
});
