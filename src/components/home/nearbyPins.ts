import type { PlantEvent, PlantListing } from '@/types';
import { getDistanceKm } from '@/utils/distance';
import type { SelectedPin } from './mapPins';
import type { Coordinates } from './useHomeLocation';

export const NEARBY_RADIUS_KM = 25;
export const NEARBY_LIMIT = 30;

export type NearbyPin = {
  key: string;
  pin: SelectedPin;
  distanceKm: number;
};

function distanceFrom(origin: Coordinates, latitude: number, longitude: number): number {
  return getDistanceKm(origin.latitude, origin.longitude, latitude, longitude);
}

export function nearbyPins(
  listings: PlantListing[],
  events: PlantEvent[],
  origin: Coordinates,
  radiusKm: number = NEARBY_RADIUS_KM,
  limit: number = NEARBY_LIMIT
): NearbyPin[] {
  const candidates: NearbyPin[] = [
    ...listings.map((listing) => ({
      key: `listing-${listing.id}`,
      pin: { kind: 'listing' as const, listing },
      distanceKm: distanceFrom(origin, listing.latitude, listing.longitude),
    })),
    ...events.map((event) => ({
      key: `event-${event.id}`,
      pin: { kind: 'event' as const, event },
      distanceKm: distanceFrom(origin, event.latitude, event.longitude),
    })),
  ];
  return candidates
    .filter((candidate) => candidate.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}
