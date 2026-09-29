import { EVENT_STATUS, LISTING_STATUS, type PlantEvent, type PlantListing } from '@/types';

export type ManageSection<T> = {
  key: 'open' | 'closed';
  data: T[];
};

function nonEmpty<T>(sections: ManageSection<T>[]): ManageSection<T>[] {
  return sections.filter((section) => section.data.length > 0);
}

export function groupListingsByStatus(listings: PlantListing[]): ManageSection<PlantListing>[] {
  return nonEmpty([
    { key: 'open', data: listings.filter((listing) => listing.status === LISTING_STATUS.AVAILABLE) },
    { key: 'closed', data: listings.filter((listing) => listing.status !== LISTING_STATUS.AVAILABLE) },
  ]);
}

export function isEventClosed(event: PlantEvent, now: Date): boolean {
  return event.status === EVENT_STATUS.CANCELLED || new Date(event.eventDate).getTime() < now.getTime();
}

function byEventDate(direction: 1 | -1) {
  return (a: PlantEvent, b: PlantEvent) => direction * (new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
}

export function groupEventsByStatus(events: PlantEvent[], now: Date): ManageSection<PlantEvent>[] {
  return nonEmpty([
    { key: 'open', data: events.filter((event) => !isEventClosed(event, now)).sort(byEventDate(1)) },
    { key: 'closed', data: events.filter((event) => isEventClosed(event, now)).sort(byEventDate(-1)) },
  ]);
}
