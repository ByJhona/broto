import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { LISTING_TYPE_COLORS, LISTING_TYPE_ICONS, LISTING_TYPE_LABELS } from '@/utils';
import type { PlantListing } from '@/types';
import { ListRow } from './ListRow';

type ListingCalloutProps = {
  listing: PlantListing;
  distanceLabel?: string | null;
  onPress: () => void;
};

export function ListingCallout({ listing, distanceLabel, onPress }: Readonly<ListingCalloutProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const Icon = LISTING_TYPE_ICONS[listing.listingType];
  const color = LISTING_TYPE_COLORS[listing.listingType];
  const label = LISTING_TYPE_LABELS[listing.listingType];
  const coverPhotoUrl = listing.photoUrls[0] ?? null;
  const subtitleParts = [listing.ownerName, label, distanceLabel].filter(Boolean);
  const subtitle = subtitleParts.join(' · ');

  return (
    <ListRow
      variant="card"
      onPress={onPress}
      leading={
        coverPhotoUrl ? (
          <Image source={{ uri: coverPhotoUrl }} style={styles.photo} contentFit="cover" />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Icon size={20} color={color} strokeWidth={Metrics.icon.strokeWidth} />
          </View>
        )
      }
      title={listing.title}
      subtitle={subtitle}
      trailing={<ChevronRight size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />}
    />
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    photo: {
      width: 48,
      height: 48,
      borderRadius: Metrics.radius.md,
      backgroundColor: colors.muted,
    },
    photoPlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
