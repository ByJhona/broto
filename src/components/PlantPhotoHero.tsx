import { useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Leaf, X } from 'lucide-react-native';
import { Colors, Metrics, Overlays } from '@/theme';
import { updatePlantPhoto } from '@/services';
import type { Plant } from '@/types';
import { Alert, Toast } from '@/utils';
import { IconBadge } from './IconBadge';
import { PlantHero } from './PlantHero';

type PlantPhotoHeroProps = {
  plant: Plant;
  onPhotoUrlChange: (photoUrl: string) => void;
};

export function PlantPhotoHero({ plant, onPhotoUrlChange }: PlantPhotoHeroProps) {
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

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
      const photoUrl = await updatePlantPhoto(plant.id, result.assets[0].uri);
      onPhotoUrlChange(photoUrl);
    } catch (err) {
      Toast.error(err instanceof Error ? err.message : 'Não foi possível salvar a foto.');
    } finally {
      setIsUpdatingPhoto(false);
    }
  };

  const handlePhotoPress = () => {
    const options: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [];
    if (plant.photoUrl) {
      options.push({ text: 'Ver foto', onPress: () => setIsViewerOpen(true) });
    }
    options.push(
      { text: 'Tirar foto', onPress: () => handlePickAndUpload('camera') },
      { text: 'Escolher da galeria', onPress: () => handlePickAndUpload('gallery') },
      { text: 'Cancelar', style: 'cancel' }
    );

    Alert.alert('Foto da planta', undefined, options);
  };

  return (
    <>
      {plant.photoUrl ? (
        <PlantHero
          photoUrl={plant.photoUrl}
          name={plant.name}
          species={plant.species}
          onPress={handlePhotoPress}
          disabled={isUpdatingPhoto}
        >
          <IconBadge backgroundColor={Overlays.scrimMedium} style={styles.heroEditBadge}>
            {isUpdatingPhoto ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Camera size={Metrics.icon.small} color={Colors.white} strokeWidth={Metrics.icon.strokeWidth} />
            )}
          </IconBadge>
        </PlantHero>
      ) : (
        <>
          <Pressable onPress={handlePhotoPress} disabled={isUpdatingPhoto} style={styles.heroPlaceholder}>
            {isUpdatingPhoto ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <>
                <Leaf size={Metrics.icon.xl} color={Colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
                <Text style={styles.heroPlaceholderText}>Toque para adicionar uma foto</Text>
              </>
            )}
          </Pressable>
          <View style={styles.plainHeader}>
            <Text style={styles.name}>{plant.name}</Text>
            {plant.species ? <Text style={styles.scientificName}>{plant.species}</Text> : null}
          </View>
        </>
      )}

      <Modal visible={isViewerOpen} transparent animationType="fade" onRequestClose={() => setIsViewerOpen(false)}>
        <View style={styles.viewerBackdrop}>
          <Pressable style={styles.viewerClose} onPress={() => setIsViewerOpen(false)}>
            <X size={Metrics.icon.large} color={Colors.white} strokeWidth={Metrics.icon.strokeWidth} />
          </Pressable>
          {plant.photoUrl ? <Image source={{ uri: plant.photoUrl }} style={styles.viewerImage} /> : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  heroEditBadge: {
    position: 'absolute',
    top: Metrics.spacing.md,
    right: Metrics.spacing.md,
  },
  heroPlaceholder: {
    width: '100%',
    height: 260,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Metrics.spacing.sm,
  },
  heroPlaceholderText: {
    fontSize: 13,
    color: Colors.mutedForeground,
  },
  plainHeader: {
    alignItems: 'center',
    paddingTop: Metrics.spacing.lg,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.foreground,
    textAlign: 'center',
  },
  scientificName: {
    fontSize: 14,
    fontStyle: 'italic',
    color: Colors.mutedForeground,
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
    resizeMode: 'contain',
  },
});
