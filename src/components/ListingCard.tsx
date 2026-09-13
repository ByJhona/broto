import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { LISTING_TYPE_COLORS, LISTING_TYPE_ICONS, LISTING_TYPE_LABELS } from '@/utils';
import type { PlantListing } from '@/types';

const LISTING_CARD_WIDTH = 220;

type ListingCardProps = {
  listing: PlantListing;
  distanceLabel?: string | null;
  onPress: () => void;
};

export function ListingCard({ listing, distanceLabel, onPress }: Readonly<ListingCardProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const Icon = LISTING_TYPE_ICONS[listing.listingType];
  const color = LISTING_TYPE_COLORS[listing.listingType];
  const label = LISTING_TYPE_LABELS[listing.listingType];
  const coverPhotoUrl = listing.photoUrls[0] ?? null;
  const metaLine = [listing.ownerName, distanceLabel].filter(Boolean).join(' · ');

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {coverPhotoUrl ? (
        <Image source={{ uri: coverPhotoUrl }} style={styles.photo} contentFit="cover" />
      ) : (
        <View style={[styles.photo, styles.photoPlaceholder]}>
          <Icon size={28} color={color} strokeWidth={Metrics.icon.strokeWidth} />
        </View>
      )}

      <View style={styles.body}>
        <View style={[styles.badge, { backgroundColor: color }]}>
          <Icon size={11} color={colors.white} strokeWidth={Metrics.icon.strokeWidth} />
          <Text style={styles.badgeText}>{label}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {listing.title}
        </Text>
        {metaLine ? (
          <Text style={styles.owner} numberOfLines={1}>
            {metaLine}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      width: LISTING_CARD_WIDTH,
      backgroundColor: colors.card,
      borderRadius: Metrics.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    photo: {
      width: '100%',
      height: 100,
      backgroundColor: colors.muted,
    },
    photoPlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    body: {
      padding: Metrics.spacing.sm,
      gap: 4,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 4,
      borderRadius: Metrics.radius.full,
      paddingVertical: 2,
      paddingHorizontal: 6,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.white,
    },
    title: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.foreground,
    },
    owner: {
      fontSize: 12,
      color: colors.mutedForeground,
    },
  });
