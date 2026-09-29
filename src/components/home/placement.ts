import { EVENT_COLOR, EVENT_ICON, LISTING_TYPE_COLORS, LISTING_TYPE_ICONS } from '@/utils';
import { type ListingType } from '@/types';

export type PlacingParams = {
  placingListing?: string;
  placingEvent?: string;
  listingType?: ListingType;
  plantId?: string;
  title?: string;
  description?: string;
  eventDate?: string;
  photoUrls?: string;
  photoUris?: string;
  priceCents?: string;
  shareToCommunity?: string;
  communityCaption?: string;
};

export function parsePhotoList(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

type PlacingKind = 'listing' | 'event' | null;

export function resolvePlacingKind(params: PlacingParams): PlacingKind {
  if (params.placingListing === '1') return 'listing';
  if (params.placingEvent === '1') return 'event';
  return null;
}

export function resolveDraftColor(placingKind: PlacingKind, listingType: ListingType | undefined, defaultColor: string): string {
  if (placingKind === 'event') return EVENT_COLOR;
  if (listingType) return LISTING_TYPE_COLORS[listingType];
  return defaultColor;
}

export function resolveDraftIcon(placingKind: PlacingKind, listingType: ListingType | undefined) {
  if (placingKind === 'event') return EVENT_ICON;
  if (listingType) return LISTING_TYPE_ICONS[listingType];
  return undefined;
}
