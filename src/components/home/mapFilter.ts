import type { ListingType, PlantEvent, PlantListing } from '@/types';

export const MAP_FILTER_ALL = 'all';
export const MAP_FILTER_EVENTS = 'events';

export type MapFilter = typeof MAP_FILTER_ALL | typeof MAP_FILTER_EVENTS | ListingType;

export function filterMapItems(
  listings: PlantListing[],
  events: PlantEvent[],
  filter: MapFilter
): { listings: PlantListing[]; events: PlantEvent[] } {
  if (filter === MAP_FILTER_ALL) return { listings, events };
  if (filter === MAP_FILTER_EVENTS) return { listings: [], events };
  return { listings: listings.filter((listing) => listing.listingType === filter), events: [] };
}
