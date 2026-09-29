import { useMemo } from 'react';
import { PixelRatio } from 'react-native';
import { GoogleMaps } from 'expo-maps';
import { useImage, type ImageRef } from 'expo-image';
import { LISTING_TYPE, type ListingType, type PlantEvent, type PlantListing } from '@/types';

export type SelectedPin = { kind: 'listing'; listing: PlantListing } | { kind: 'event'; event: PlantEvent };

const LISTING_MARKER_PREFIX = 'listing-';
const EVENT_MARKER_PREFIX = 'event-';

type PinIconSet = { default: ImageRef | null; highlighted: ImageRef | null };
type PinIcons = Record<ListingType | 'event', PinIconSet>;

const MARKER_SIZE = Math.round(40 * PixelRatio.get());
const HIGHLIGHTED_MARKER_SIZE = Math.round(56 * PixelRatio.get());
const MARKER_LOAD_OPTIONS = { maxWidth: MARKER_SIZE, maxHeight: MARKER_SIZE };
const HIGHLIGHTED_MARKER_LOAD_OPTIONS = { maxWidth: HIGHLIGHTED_MARKER_SIZE, maxHeight: HIGHLIGHTED_MARKER_SIZE };

export function useMapPinIcons(): PinIcons {
  const donation = useImage(require('../../../assets/images/map-pins/donation.png'), MARKER_LOAD_OPTIONS);
  const donationHighlighted = useImage(
    require('../../../assets/images/map-pins/donation-highlighted.png'),
    HIGHLIGHTED_MARKER_LOAD_OPTIONS
  );
  const exchange = useImage(require('../../../assets/images/map-pins/exchange.png'), MARKER_LOAD_OPTIONS);
  const exchangeHighlighted = useImage(
    require('../../../assets/images/map-pins/exchange-highlighted.png'),
    HIGHLIGHTED_MARKER_LOAD_OPTIONS
  );
  const discard = useImage(require('../../../assets/images/map-pins/discard.png'), MARKER_LOAD_OPTIONS);
  const discardHighlighted = useImage(
    require('../../../assets/images/map-pins/discard-highlighted.png'),
    HIGHLIGHTED_MARKER_LOAD_OPTIONS
  );
  const sale = useImage(require('../../../assets/images/map-pins/sale.png'), MARKER_LOAD_OPTIONS);
  const saleHighlighted = useImage(
    require('../../../assets/images/map-pins/sale-highlighted.png'),
    HIGHLIGHTED_MARKER_LOAD_OPTIONS
  );
  const event = useImage(require('../../../assets/images/map-pins/event.png'), MARKER_LOAD_OPTIONS);
  const eventHighlighted = useImage(
    require('../../../assets/images/map-pins/event-highlighted.png'),
    HIGHLIGHTED_MARKER_LOAD_OPTIONS
  );

  return useMemo(
    () => ({
      [LISTING_TYPE.DONATION]: { default: donation, highlighted: donationHighlighted },
      [LISTING_TYPE.EXCHANGE]: { default: exchange, highlighted: exchangeHighlighted },
      [LISTING_TYPE.DISCARD]: { default: discard, highlighted: discardHighlighted },
      [LISTING_TYPE.SALE]: { default: sale, highlighted: saleHighlighted },
      event: { default: event, highlighted: eventHighlighted },
    }),
    [donation, donationHighlighted, exchange, exchangeHighlighted, discard, discardHighlighted, sale, saleHighlighted, event, eventHighlighted]
  );
}

export function allPinIconsLoaded(icons: PinIcons): boolean {
  return Object.values(icons).every((set) => set.default && set.highlighted);
}

function buildListingMarker(listing: PlantListing, icons: PinIconSet, isHighlighted: boolean): GoogleMaps.Marker {
  return {
    id: `${LISTING_MARKER_PREFIX}${listing.id}`,
    coordinates: { latitude: listing.latitude, longitude: listing.longitude },
    icon: (isHighlighted ? icons.highlighted : icons.default) ?? undefined,
    anchor: { x: 0.5, y: 0.5 },
    zIndex: isHighlighted ? 1 : 0,
    showCallout: false,
  };
}

function buildEventMarker(event: PlantEvent, icons: PinIconSet, isHighlighted: boolean): GoogleMaps.Marker {
  return {
    id: `${EVENT_MARKER_PREFIX}${event.id}`,
    coordinates: { latitude: event.latitude, longitude: event.longitude },
    icon: (isHighlighted ? icons.highlighted : icons.default) ?? undefined,
    anchor: { x: 0.5, y: 0.5 },
    zIndex: isHighlighted ? 1 : 0,
    showCallout: false,
  };
}

export function buildMarkers(
  listings: PlantListing[],
  events: PlantEvent[],
  icons: PinIcons,
  selectedPin: SelectedPin | null
): GoogleMaps.Marker[] {
  const selectedListingId = selectedPin?.kind === 'listing' ? selectedPin.listing.id : null;
  const selectedEventId = selectedPin?.kind === 'event' ? selectedPin.event.id : null;
  return [
    ...listings.map((listing) => buildListingMarker(listing, icons[listing.listingType], listing.id === selectedListingId)),
    ...events.map((event) => buildEventMarker(event, icons.event, event.id === selectedEventId)),
  ];
}

export function findPinForMarker(
  markerId: string | undefined,
  listings: PlantListing[],
  events: PlantEvent[]
): SelectedPin | null {
  const listing = listings.find((item) => markerId === `${LISTING_MARKER_PREFIX}${item.id}`);
  if (listing) return { kind: 'listing', listing };
  const event = events.find((item) => markerId === `${EVENT_MARKER_PREFIX}${item.id}`);
  if (event) return { kind: 'event', event };
  return null;
}
