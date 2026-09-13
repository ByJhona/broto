import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Pencil from 'lucide-react-native/icons/pencil';
import Plus from 'lucide-react-native/icons/plus';
import Trash2 from 'lucide-react-native/icons/trash-2';
import X from 'lucide-react-native/icons/x';
import { Metrics, Overlays, useColors, type ThemeColors } from '@/theme';
import { addPlantPhoto, MAX_PLANT_PHOTOS, removePlantPhoto } from '@/services';
import type { Plant } from '@/types';
import { Alert, Toast } from '@/utils';
import { IconBadge } from './IconBadge';

const HERO_HEIGHT = 260;

type PlantPhotoHeroProps = {
  plant: Plant;
  onPhotoUrlsChange: (photoUrls: string[]) => void;
  onEditName?: () => void;
};

export function PlantPhotoHero({ plant, onPhotoUrlsChange, onEditName }: Readonly<PlantPhotoHeroProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const windowWidth = useWindowDimensions().width;
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [viewerPhotoUrl, setViewerPhotoUrl] = useState<string | null>(null);

  const handlePickAndUpload = async (source: 'camera' | 'gallery') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) return;

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true, aspect: [4, 3] })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.7,
            allowsEditing: true,
            aspect: [4, 3],
          });

    if (result.canceled) return;

    setIsUpdatingPhoto(true);
    try {
      const updated = await addPlantPhoto(plant.id, result.assets[0].uri);
      onPhotoUrlsChange(updated.photoUrls);
    } catch (err) {
      Toast.error(err instanceof Error ? err.message : 'Não foi possível salvar a foto.');
    } finally {
      setIsUpdatingPhoto(false);
    }
  };

  const handleAddPhoto = () => {
    Alert.alert('Adicionar foto', undefined, [
      { text: 'Tirar foto', onPress: () => handlePickAndUpload('camera') },
      { text: 'Escolher da galeria', onPress: () => handlePickAndUpload('gallery') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const handleRemovePhoto = async (photoUrl: string) => {
    try {
      const updated = await removePlantPhoto(plant.id, photoUrl);
      onPhotoUrlsChange(updated.photoUrls);
    } catch (err) {
      Toast.error(err instanceof Error ? err.message : 'Não foi possível remover a foto.');
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
                <Image source={{ uri: url }} style={[styles.galleryImage, { width: windowWidth }]} />
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
                  <Text style={styles.addPageText}>Adicionar foto</Text>
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

      <Modal visible={!!viewerPhotoUrl} transparent animationType="fade" onRequestClose={() => setViewerPhotoUrl(null)}>
        <View style={styles.viewerBackdrop}>
          <Pressable style={styles.viewerClose} onPress={() => setViewerPhotoUrl(null)}>
            <X size={Metrics.icon.large} color={colors.white} strokeWidth={Metrics.icon.strokeWidth} />
          </Pressable>
          {viewerPhotoUrl ? <Image source={{ uri: viewerPhotoUrl }} style={styles.viewerImage} resizeMode="contain" /> : null}
        </View>
      </Modal>
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
    viewerBackdrop: {
      flex: 1,
      backgroundColor: Overlays.scrimStrong,
      justifyContent: 'center',
      alignItems: 'center',
    },
    viewerClose: {
      position: 'absolute',
      top: 60,
      right: Metrics.spacing.lg,
      zIndex: 1,
    },
    viewerImage: {
      width: '90%',
      height: '60%',
      borderRadius: Metrics.radius.lg,
    },
  });
