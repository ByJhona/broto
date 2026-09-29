import type { PlantEvent, PlantListing } from '@/types';
import { nearbyPins, pinsByDistance, searchPins, sortByEventDate } from './nearbyPins';

const origin = { latitude: -23.55, longitude: -46.63 };

function listing(id: string, latitude: number): PlantListing {
  return { id, latitude, longitude: origin.longitude } as PlantListing;
}

function event(id: string, latitude: number): PlantEvent {
  return { id, latitude, longitude: origin.longitude } as PlantEvent;
}

describe('nearbyPins', () => {
  it('sorts listings and events together by distance', () => {
    const result = nearbyPins([listing('far', -23.6), listing('near', -23.551)], [event('middle', -23.56)], origin);

    expect(result.map((item) => item.key)).toEqual(['listing-near', 'event-middle', 'listing-far']);
  });

  it('drops pins outside the radius', () => {
    const result = nearbyPins([listing('near', -23.551), listing('other-city', -22.9)], [], origin, 10);

    expect(result.map((item) => item.key)).toEqual(['listing-near']);
  });

  it('caps the list at the limit', () => {
    const result = nearbyPins([listing('a', -23.551), listing('b', -23.552), listing('c', -23.553)], [], origin, 25, 2);

    expect(result.map((item) => item.key)).toEqual(['listing-a', 'listing-b']);
  });
});

describe('searchPins', () => {
  it('matches title or description ignoring case', () => {
    const pins = pinsByDistance(
      [
        { ...listing('a', -23.551), title: 'Costela-de-adão', description: null },
        { ...listing('b', -23.552), title: 'Jiboia', description: 'Muda de costela' },
        { ...listing('c', -23.553), title: 'Samambaia', description: null },
      ],
      [],
      origin
    );

    expect(searchPins(pins, 'COSTELA').map((item) => item.key)).toEqual(['listing-a', 'listing-b']);
  });
});

describe('sortByEventDate', () => {
  it('puts the soonest events first', () => {
    const pins = pinsByDistance(
      [],
      [
        { ...event('later', -23.551), eventDate: '2026-10-20T10:00:00.000Z' },
        { ...event('sooner', -23.56), eventDate: '2026-10-01T10:00:00.000Z' },
      ],
      origin
    );

    expect(sortByEventDate(pins).map((item) => item.key)).toEqual(['event-sooner', 'event-later']);
  });
});
