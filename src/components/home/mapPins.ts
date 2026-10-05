import type { LucideIcon } from 'lucide-react-native';
import type { PlantEvent, PlantListing } from '@/types';
import { EVENT_COLOR, EVENT_ICON, LISTING_TYPE_COLORS, LISTING_TYPE_ICONS } from '@/utils';

export type SelectedPin = { kind: 'listing'; listing: PlantListing } | { kind: 'event'; event: PlantEvent };

export type PinAppearance = {
  key: string;
  coordinate: { latitude: number; longitude: number };
  color: string;
  icon: LucideIcon;
  photoUrl: string | null;
};

export function mapPins(listings: PlantListing[], events: PlantEvent[]): SelectedPin[] {
  return [
    ...listings.map((listing) => ({ kind: 'listing' as const, listing })),
    ...events.map((event) => ({ kind: 'event' as const, event })),
  ];
}

export function pinAppearance(pin: SelectedPin): PinAppearance {
  if (pin.kind === 'listing') {
    const { listing } = pin;
    return {
      key: `listing-${listing.id}`,
      coordinate: { latitude: listing.latitude, longitude: listing.longitude },
      color: LISTING_TYPE_COLORS[listing.listingType],
      icon: LISTING_TYPE_ICONS[listing.listingType],
      photoUrl: listing.photoUrls[0] ?? null,
    };
  }
  const { event } = pin;
  return {
    key: `event-${event.id}`,
    coordinate: { latitude: event.latitude, longitude: event.longitude },
    color: EVENT_COLOR,
    icon: EVENT_ICON,
    photoUrl: event.photoUrl,
  };
}

export function isSamePin(a: SelectedPin | null, b: SelectedPin): boolean {
  return !!a && pinAppearance(a).key === pinAppearance(b).key;
}
