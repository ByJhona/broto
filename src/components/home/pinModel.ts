import type { Href } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import {
  EVENT_COLOR,
  EVENT_ICON,
  formatEventDateTime,
  LISTING_TYPE_COLORS,
  LISTING_TYPE_ICONS,
  listingBadgeLabel,
} from '@/utils';
import type { SelectedPin } from './mapPins';

export type PinModel = {
  photoUrl: string | null;
  icon: LucideIcon;
  color: string;
  badgeLabel: string;
  title: string;
  subtitle: string;
  actionLabel: string;
  href: Href;
  latitude: number;
  longitude: number;
};

export function pinModel(pin: SelectedPin, t: (key: string, options?: Record<string, unknown>) => string): PinModel {
  if (pin.kind === 'listing') {
    const { listing } = pin;
    return {
      photoUrl: listing.photoUrls[0] ?? null,
      icon: LISTING_TYPE_ICONS[listing.listingType],
      color: LISTING_TYPE_COLORS[listing.listingType],
      badgeLabel: listingBadgeLabel(listing.listingType, listing.priceCents),
      title: listing.title,
      subtitle: listing.ownerName ?? '',
      actionLabel: t('home:viewListing'),
      href: { pathname: '/listing/[id]', params: { id: listing.id } },
      latitude: listing.latitude,
      longitude: listing.longitude,
    };
  }
  const { event } = pin;
  return {
    photoUrl: event.photoUrl,
    icon: EVENT_ICON,
    color: EVENT_COLOR,
    badgeLabel: t('home:eventBadge'),
    title: event.title,
    subtitle: [formatEventDateTime(event.eventDate), t('event:attendeesShort', { count: event.attendeeCount })].join(' · '),
    actionLabel: t('home:viewEvent'),
    href: { pathname: '/event/[id]', params: { id: event.id } },
    latitude: event.latitude,
    longitude: event.longitude,
  };
}
