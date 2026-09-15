import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import Pencil from 'lucide-react-native/icons/pencil';
import Plus from 'lucide-react-native/icons/plus';
import Trash2 from 'lucide-react-native/icons/trash-2';
import { Metrics, Overlays, useColors, type ThemeColors } from '@/theme';
import { useTranslation } from '@/i18n';
import { addPlantPhoto, MAX_PLANT_PHOTOS, removePlantPhoto } from '@/services';
import type { Plant } from '@/types';
import { pickPhoto, Toast } from '@/utils';
import { IconBadge } from './IconBadge';
import { PhotoViewerModal } from './PhotoViewerModal';

const HERO_HEIGHT = 260;

type PlantPhotoHeroProps = {
  plant: Plant;
  onPhotoUrlsChange: (photoUrls: string[]) => void;
  onEditName?: () => void;
};

export function PlantPhotoHero({ plant, onPhotoUrlsChange, onEditName }: Readonly<PlantPhotoHeroProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation('plant');
  const windowWidth = useWindowDimensions().width;
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [viewerPhotoUrl, setViewerPhotoUrl] = useState<string | null>(null);

  const handleAddPhoto = async () => {
    const uri = await pickPhoto();
    if (!uri) return;

    setIsUpdatingPhoto(true);
    try {
      const updated = await addPlantPhoto(plant.id, uri);
      onPhotoUrlsChange(updated.photoUrls);
    } catch (err) {
      Toast.error(err instanceof Error ? err.message : t('addPhotoError'));
    } finally {
      setIsUpdatingPhoto(false);
    }
  };

  const handleRemovePhoto = async (photoUrl: string) => {
    try {
      const updated = await removePlantPhoto(plant.id, photoUrl);
      onPhotoUrlsChange(updated.photoUrls);
    } catch (err) {
      Toast.error(err instanceof Error ? err.message : t('removePhotoError'));
    }
  };

  return (
    <>
      <View style={styles.galleryWrapper}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => setPhotoIndex(Math.round(event.nativeEvent.contentOffset.x / windowWidth))}
        >
          {plant.photoUrls.map((url) => (
            <View key={url} style={{ width: windowWidth }}>
              <Pressable onPress={() => setViewerPhotoUrl(url)}>
                <Image source={{ uri: url }} style={[styles.galleryImage, { width: windowWidth }]} contentFit="cover" />
              </Pressable>
              <Pressable style={styles.deleteBadge} onPress={() => handleRemovePhoto(url)} hitSlop={8}>
                <IconBadge backgroundColor={Overlays.scrimMedium} size={32}>
                  <Trash2 size={16} color={colors.white} strokeWidth={Metrics.icon.strokeWidth} />
                </IconBadge>
              </Pressable>
            </View>
          ))}

          {plant.photoUrls.length < MAX_PLANT_PHOTOS ? (
            <Pressable
              style={[styles.addPage, { width: windowWidth }]}
              onPress={handleAddPhoto}
              disabled={isUpdatingPhoto}
            >
              {isUpdatingPhoto ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <Plus size={Metrics.icon.xl} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
                  <Text style={styles.addPageText}>{t('addPhoto')}</Text>
                </>
              )}
            </Pressable>
          ) : null}
        </ScrollView>

        {plant.photoUrls.length > 0 && photoIndex < plant.photoUrls.length ? (
          <View style={styles.photoCounter}>
            <Text style={styles.photoCounterText}>
              {photoIndex + 1}/{plant.photoUrls.length}
            </Text>
          </View>
        ) : null}

        <View style={styles.scrim} pointerEvents="box-none">
          <View style={styles.nameRow}>
            <Text style={styles.name}>{plant.name}</Text>
            {onEditName ? (
              <Pressable onPress={onEditName} hitSlop={8} style={styles.editNameButton}>
                <Pencil size={16} color={colors.white} strokeWidth={Metrics.icon.strokeWidth} />
              </Pressable>
            ) : null}
          </View>
          {plant.species ? <Text style={styles.scientificName}>{plant.species}</Text> : null}
        </View>
      </View>

      <PhotoViewerModal photoUrl={viewerPhotoUrl} onClose={() => setViewerPhotoUrl(null)} />
    </>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    galleryWrapper: {
      position: 'relative',
      width: '100%',
      height: HERO_HEIGHT,
    },
    galleryImage: {
      height: HERO_HEIGHT,
      backgroundColor: colors.muted,
    },
    deleteBadge: {
      position: 'absolute',
      top: Metrics.spacing.md,
      right: Metrics.spacing.md,
    },
    addPage: {
      height: HERO_HEIGHT,
      backgroundColor: colors.muted,
      justifyContent: 'center',
      alignItems: 'center',
      gap: Metrics.spacing.sm,
      paddingBottom: 90,
    },
    addPageText: {
      fontSize: 13,
      color: colors.mutedForeground,
    },
    photoCounter: {
      position: 'absolute',
      top: Metrics.spacing.md,
      left: Metrics.spacing.md,
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
    scrim: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: Overlays.scrim,
      paddingHorizontal: Metrics.spacing.lg,
      paddingVertical: Metrics.spacing.md,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.xs,
    },
    name: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.white,
    },
    editNameButton: {
      padding: 4,
    },
    scientificName: {
      fontSize: 15,
      fontStyle: 'italic',
      color: colors.white,
      opacity: 0.9,
      marginTop: 2,
    },
  });
