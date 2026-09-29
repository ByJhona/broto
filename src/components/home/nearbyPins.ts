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

function pinText(pin: SelectedPin): { title: string; description: string | null } {
  return pin.kind === 'listing' ? pin.listing : pin.event;
}

export function matchesQuery(item: { title: string; description: string | null }, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return item.title.toLowerCase().includes(normalized) || (item.description ?? '').toLowerCase().includes(normalized);
}

export function pinsByDistance(listings: PlantListing[], events: PlantEvent[], origin: Coordinates): NearbyPin[] {
  const pins: NearbyPin[] = [
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
  return pins.sort((a, b) => a.distanceKm - b.distanceKm);
}

export function limitToRadius(pins: NearbyPin[], radiusKm: number = NEARBY_RADIUS_KM, limit: number = NEARBY_LIMIT): NearbyPin[] {
  return pins.filter((candidate) => candidate.distanceKm <= radiusKm).slice(0, limit);
}

export function nearbyPins(
  listings: PlantListing[],
  events: PlantEvent[],
  origin: Coordinates,
  radiusKm: number = NEARBY_RADIUS_KM,
  limit: number = NEARBY_LIMIT
): NearbyPin[] {
  return limitToRadius(pinsByDistance(listings, events, origin), radiusKm, limit);
}

export function searchPins(pins: NearbyPin[], query: string): NearbyPin[] {
  return pins.filter((item) => matchesQuery(pinText(item.pin), query));
}

export function sortByEventDate(pins: NearbyPin[]): NearbyPin[] {
  const eventTime = (item: NearbyPin) => (item.pin.kind === 'event' ? new Date(item.pin.event.eventDate).getTime() : Infinity);
  return [...pins].sort((a, b) => eventTime(a) - eventTime(b));
}
