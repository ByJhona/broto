import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Metrics, useColors, useThemedStyles } from '@/theme';
import { isBoostActive } from '@/services';
import type { PlantListing } from '@/types';
import { LISTING_TYPE_COLORS, LISTING_TYPE_ICONS, listingTypeLabel } from '@/utils';
import { FeaturedBadge } from '../FeaturedBadge';
import { ListRow } from '../ListRow';
import { Thumbnail } from '../Thumbnail';
import { makeRowStyles } from './styles';

export type ListingRowData = Pick<PlantListing, 'title' | 'listingType' | 'photoUrls' | 'boostedUntil'>;

type ListingRowProps = {
  listing: ListingRowData;
  subtitle?: string;
  trailing: ReactNode;
  onPress: () => void;
};

export function ListingRow({ listing, subtitle, trailing, onPress }: Readonly<ListingRowProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeRowStyles);
  const Icon = LISTING_TYPE_ICONS[listing.listingType];
  const color = LISTING_TYPE_COLORS[listing.listingType];
  const coverPhotoUrl = listing.photoUrls[0] ?? null;

  return (
    <ListRow
      variant="card"
      style={styles.row}
      leading={
        <View style={styles.thumbWrapper}>
          <Thumbnail photoUrl={coverPhotoUrl} icon={Icon} color={color} size={Metrics.size.xl} />
          {isBoostActive(listing.boostedUntil) ? <FeaturedBadge compact style={styles.thumbBadge} /> : null}
        </View>
      }
      title={listing.title}
      titleTrailing={
        <View style={[styles.typeBadge, { backgroundColor: color }]}>
          <Icon size={Metrics.chip.sm.iconSize} color={colors.white} strokeWidth={Metrics.icon.stroke.regular} />
          <Text style={styles.typeBadgeText}>{listingTypeLabel(listing.listingType)}</Text>
        </View>
      }
      subtitle={subtitle}
      trailing={trailing}
      onPress={onPress}
    />
  );
}
