import type { ListingType, PlantEvent, PlantListing } from '@/types';

export const MAP_FILTER_EVENTS = 'events';

export type MapFilter = typeof MAP_FILTER_EVENTS | ListingType;

export function toggleMapFilter(filters: MapFilter[], filter: MapFilter): MapFilter[] {
  return filters.includes(filter) ? filters.filter((item) => item !== filter) : [...filters, filter];
}

export function isEventsOnly(filters: MapFilter[]): boolean {
  return filters.length === 1 && filters[0] === MAP_FILTER_EVENTS;
}

export function filterMapItems(
  listings: PlantListing[],
  events: PlantEvent[],
  filters: MapFilter[]
): { listings: PlantListing[]; events: PlantEvent[] } {
  if (filters.length === 0) return { listings, events };
  return {
    listings: listings.filter((listing) => filters.includes(listing.listingType)),
    events: filters.includes(MAP_FILTER_EVENTS) ? events : [],
  };
}
