import type { PlantEvent, PlantListing } from '@/types';
import { nearbyPins } from './nearbyPins';

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
