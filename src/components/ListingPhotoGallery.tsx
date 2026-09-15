import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Metrics, Overlays, useColors, type ThemeColors } from '@/theme';
import { FeaturedBadge } from './FeaturedBadge';
import { PhotoViewerModal } from './PhotoViewerModal';

const HERO_HEIGHT = 260;

type ListingPhotoGalleryProps = {
  photoUrls: string[];
  title: string;
  typeIcon: LucideIcon;
  typeColor: string;
  typeLabel: string;
  priceLabel?: string | null;
  featured?: boolean;
};

export function ListingPhotoGallery({
  photoUrls,
  title,
  typeIcon: TypeIcon,
  typeColor,
  typeLabel,
  priceLabel,
  featured,
}: Readonly<ListingPhotoGalleryProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const windowWidth = useWindowDimensions().width;
  const [photoIndex, setPhotoIndex] = useState(0);
  const [viewerPhotoUrl, setViewerPhotoUrl] = useState<string | null>(null);

  return (
    <>
      <View style={styles.gallery}>
        {photoUrls.length > 0 ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => setPhotoIndex(Math.round(event.nativeEvent.contentOffset.x / windowWidth))}
          >
            {photoUrls.map((url) => (
              <Pressable key={url} onPress={() => setViewerPhotoUrl(url)}>
                <Image source={{ uri: url }} style={[styles.galleryImage, { width: windowWidth }]} />
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.heroPlaceholder}>
            <TypeIcon size={Metrics.icon.xl} color={typeColor} strokeWidth={Metrics.icon.strokeWidth} />
          </View>
        )}

        <View style={styles.typeBadgeFloating}>
          <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
            <TypeIcon size={14} color={colors.white} strokeWidth={Metrics.icon.strokeWidth} />
            <Text style={styles.typeBadgeText}>{typeLabel}</Text>
          </View>
        </View>

        {featured ? <FeaturedBadge style={styles.featuredBadgeFloating} /> : null}

        {photoUrls.length > 0 ? (
          <View style={[styles.photoCounter, featured && styles.photoCounterBelowFeatured]}>
            <Text style={styles.photoCounterText}>
              {photoIndex + 1}/{photoUrls.length}
            </Text>
          </View>
        ) : null}

        <View style={styles.scrim} pointerEvents="none">
          <Text style={styles.name}>{title}</Text>
          {priceLabel ? (
            <View style={[styles.priceBadge, { backgroundColor: typeColor }]}>
              <Text style={styles.priceBadgeText}>{priceLabel}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <PhotoViewerModal photoUrl={viewerPhotoUrl} onClose={() => setViewerPhotoUrl(null)} />
    </>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    gallery: {
      position: 'relative',
      width: '100%',
      height: HERO_HEIGHT,
    },
    galleryImage: {
      height: HERO_HEIGHT,
      backgroundColor: colors.muted,
    },
    photoCounter: {
      position: 'absolute',
      top: Metrics.spacing.md,
      right: Metrics.spacing.md,
      backgroundColor: Overlays.scrimMedium,
      borderRadius: Metrics.radius.full,
      paddingVertical: 4,
      paddingHorizontal: Metrics.spacing.sm,
    },
    photoCounterBelowFeatured: {
      top: Metrics.spacing.md * 2 + 20,
    },
    featuredBadgeFloating: {
      position: 'absolute',
      top: Metrics.spacing.md,
      right: Metrics.spacing.md,
    },
    photoCounterText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.white,
    },
    heroPlaceholder: {
      width: '100%',
      height: HERO_HEIGHT,
      backgroundColor: colors.muted,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrim: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: Overlays.scrim,
      paddingHorizontal: Metrics.spacing.lg,
      paddingVertical: Metrics.spacing.md,
    },
    name: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.white,
    },
    priceBadge: {
      alignSelf: 'flex-start',
      marginTop: Metrics.spacing.xs,
      borderRadius: Metrics.radius.full,
      paddingVertical: 4,
      paddingHorizontal: Metrics.spacing.md,
    },
    priceBadgeText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.white,
    },
    typeBadgeFloating: {
      position: 'absolute',
      top: Metrics.spacing.md,
      left: Metrics.spacing.md,
    },
    typeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: Metrics.radius.full,
      paddingVertical: 6,
      paddingHorizontal: Metrics.spacing.md,
    },
    typeBadgeText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.white,
    },
  });
