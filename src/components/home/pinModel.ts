import type { Href } from 'expo-router';
import { formatEventDateTime, listingBadgeLabel } from '@/utils';
import { pinAppearance, type PinAppearance, type SelectedPin } from './mapPins';

export type PinModel = PinAppearance & {
  badgeLabel: string;
  title: string;
  subtitle: string;
  href: Href;
};

export function pinModel(pin: SelectedPin, t: (key: string, options?: Record<string, unknown>) => string): PinModel {
  const appearance = pinAppearance(pin);
  if (pin.kind === 'listing') {
    const { listing } = pin;
    return {
      ...appearance,
      badgeLabel: listingBadgeLabel(listing.listingType, listing.priceCents),
      title: listing.title,
      subtitle: listing.ownerName ?? '',
      href: { pathname: '/listing/[id]', params: { id: listing.id } },
    };
  }
  const { event } = pin;
  return {
    ...appearance,
    badgeLabel: t('home:eventBadge'),
    title: event.title,
    subtitle: [formatEventDateTime(event.eventDate), t('event:attendeesShort', { count: event.attendeeCount })].join(' · '),
    href: { pathname: '/event/[id]', params: { id: event.id } },
  };
}
