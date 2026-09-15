import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import Leaf from 'lucide-react-native/icons/leaf';
import { Metrics, Overlays, useColors, type ThemeColors } from '@/theme';
import { useTranslation } from '@/i18n';
import type { PlantReferencePhoto } from '@/types';
import { SkeletonBlock } from './Skeleton';
import { PhotoViewerModal } from './PhotoViewerModal';

const HERO_HEIGHT = 340;

type SpeciesPhotoHeroProps = {
  photos: PlantReferencePhoto[];
  isLoading: boolean;
  name: string;
  species: string;
};

type HeroGalleryProps = {
  photos: PlantReferencePhoto[];
  windowWidth: number;
  styles: ReturnType<typeof makeStyles>;
  onSelectPhoto: (index: number) => void;
  onPressPhoto: (url: string) => void;
};

function HeroGallery({ photos, windowWidth, styles, onSelectPhoto, onPressPhoto }: Readonly<HeroGalleryProps>) {
  return (
    <ScrollView
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      onMomentumScrollEnd={(event) => onSelectPhoto(Math.round(event.nativeEvent.contentOffset.x / windowWidth))}
    >
      {photos.map((photo) => (
        <Pressable key={photo.url} onPress={() => onPressPhoto(photo.url)}>
          <Image source={{ uri: photo.url }} style={[styles.heroImage, { width: windowWidth }]} contentFit="cover" />
        </Pressable>
      ))}
    </ScrollView>
  );
}

function HeroEmptyState({ styles, colors }: Readonly<{ styles: ReturnType<typeof makeStyles>; colors: ThemeColors }>) {
  const { t } = useTranslation('identify');
  return (
    <View style={styles.heroPlaceholder}>
      <Leaf size={Metrics.icon.xl} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
      <Text style={styles.noPhotosText}>{t('noReferencePhotosMessage')}</Text>
    </View>
  );
}

function HeroImageArea({
  isLoading,
  photos,
  windowWidth,
  styles,
  colors,
  onSelectPhoto,
  onPressPhoto,
}: Readonly<{
  isLoading: boolean;
  photos: PlantReferencePhoto[];
  windowWidth: number;
  styles: ReturnType<typeof makeStyles>;
  colors: ThemeColors;
  onSelectPhoto: (index: number) => void;
  onPressPhoto: (url: string) => void;
}>) {
  if (isLoading) return <SkeletonBlock height={HERO_HEIGHT} radius={0} />;
  if (photos.length > 0) {
    return (
      <HeroGallery
        photos={photos}
        windowWidth={windowWidth}
        styles={styles}
        onSelectPhoto={onSelectPhoto}
        onPressPhoto={onPressPhoto}
      />
    );
  }
  return <HeroEmptyState styles={styles} colors={colors} />;
}

export function SpeciesPhotoHero({ photos, isLoading, name, species }: Readonly<SpeciesPhotoHeroProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation('identify');
  const windowWidth = useWindowDimensions().width;
  const [photoIndex, setPhotoIndex] = useState(0);
  const [viewerPhotoUrl, setViewerPhotoUrl] = useState<string | null>(null);

  return (
    <>
      <View style={styles.hero}>
        <HeroImageArea
          isLoading={isLoading}
          photos={photos}
          windowWidth={windowWidth}
          styles={styles}
          colors={colors}
          onSelectPhoto={setPhotoIndex}
          onPressPhoto={setViewerPhotoUrl}
        />

        {photos.length > 1 ? (
          <View style={styles.photoCounter}>
            <Text style={styles.photoCounterText}>
              {photoIndex + 1}/{photos.length}
            </Text>
          </View>
        ) : null}

        {photos.length > 0 ? (
          <View style={styles.creditBadge}>
            <Text style={styles.creditText}>{t('referencePhotosCaption')}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.header}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.species}>{species}</Text>
      </View>

      <PhotoViewerModal photoUrl={viewerPhotoUrl} onClose={() => setViewerPhotoUrl(null)} />
    </>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    hero: {
      width: '100%',
      height: HERO_HEIGHT,
      backgroundColor: colors.muted,
    },
    heroImage: {
      height: HERO_HEIGHT,
      backgroundColor: colors.muted,
    },
    heroPlaceholder: {
      width: '100%',
      height: HERO_HEIGHT,
      justifyContent: 'center',
      alignItems: 'center',
      gap: Metrics.spacing.sm,
      paddingHorizontal: Metrics.spacing.xl,
    },
    noPhotosText: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: 'center',
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
    photoCounterText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.white,
    },
    creditBadge: {
      position: 'absolute',
      left: Metrics.spacing.md,
      bottom: Metrics.spacing.md,
      backgroundColor: Overlays.scrimMedium,
      borderRadius: Metrics.radius.full,
      paddingVertical: 4,
      paddingHorizontal: Metrics.spacing.sm,
    },
    creditText: {
      fontSize: 11,
      color: colors.white,
    },
    header: {
      alignItems: 'center',
      paddingTop: Metrics.spacing.lg,
    },
    name: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.foreground,
      textAlign: 'center',
    },
    species: {
      fontSize: 14,
      fontStyle: 'italic',
      color: colors.mutedForeground,
      marginTop: 2,
    },
  });
