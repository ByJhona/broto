import type { StyleProp, ViewStyle } from 'react-native';
import MapPin from 'lucide-react-native/icons/map-pin';
import User from 'lucide-react-native/icons/user';
import { Overlays } from '@/theme';
import { isBoostActive } from '@/services';
import { LISTING_STATUS, type PlantListing } from '@/types';
import { LISTING_TYPE_COLORS, LISTING_TYPE_ICONS, listingBadgeLabel, listingStatusLabel } from '@/utils';
import { FeaturedBadge } from './FeaturedBadge';
import { PhotoBadge, PhotoCard, type PhotoCardMeta } from './PhotoCard';

function listingMeta(listing: PlantListing, distanceLabel: string | null): PhotoCardMeta | null {
  if (distanceLabel) return { icon: MapPin, label: distanceLabel };
  if (listing.ownerName) return { icon: User, label: listing.ownerName };
  return null;
}

function ListingCorner({ listing }: Readonly<{ listing: PlantListing }>) {
  const statusLabel = listing.status === LISTING_STATUS.AVAILABLE ? null : listingStatusLabel(listing.status);
  if (statusLabel) return <PhotoBadge label={statusLabel} color={Overlays.scrim} />;
  if (isBoostActive(listing.boostedUntil)) return <FeaturedBadge compact />;
  return null;
}

type ListingCardProps = {
  listing: PlantListing;
  distanceLabel: string | null;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function ListingCard({ listing, distanceLabel, onPress, style }: Readonly<ListingCardProps>) {
  const typeLabel = listingBadgeLabel(listing.listingType, listing.priceCents);
  const meta = listingMeta(listing, distanceLabel);

  return (
    <PhotoCard
      title={listing.title}
      photoUrl={listing.photoUrls[0] ?? null}
      placeholderIcon={LISTING_TYPE_ICONS[listing.listingType]}
      placeholderColor={LISTING_TYPE_COLORS[listing.listingType]}
      topLeft={<PhotoBadge icon={LISTING_TYPE_ICONS[listing.listingType]} label={typeLabel} color={LISTING_TYPE_COLORS[listing.listingType]} />}
      topRight={<ListingCorner listing={listing} />}
      meta={meta}
      onPress={onPress}
      accessibilityLabel={[listing.title, typeLabel, meta?.label].filter(Boolean).join('. ')}
      recyclingKey={listing.id}
      style={style}
    />
  );
}
