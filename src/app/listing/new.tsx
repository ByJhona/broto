import { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import {
  Card,
  FormError,
  FormField,
  PhotoGrid,
  PillSelector,
  PlantPickerRow,
  ScreenContent,
  SectionTitle,
  ShareToCommunityToggle,
  SubmitButton,
} from '@/components';
import { usePlants } from '@/hooks';
import { MAX_LISTING_PHOTOS } from '@/services';
import { Alert, LISTING_TYPES } from '@/utils';
import type { ListingType } from '@/types';

export default function NewListingScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { plants } = usePlants();

  const [listingType, setListingType] = useState<ListingType>('donation');
  const [plantId, setPlantId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [shareToCommunity, setShareToCommunity] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSelectPlant = (selectedPlantId: string | null) => {
    const plant = plants.find((item) => item.id === selectedPlantId) ?? null;
    setPlantId(plant?.id ?? null);
    if (plant) {
      setTitle(plant.name);
      setImageUris(plant.photoUrl ? [plant.photoUrl] : []);
    }
  };

  const handlePickPhoto = async (source: 'camera' | 'gallery') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true, aspect: [4, 3] })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [4, 3] });

    if (result.canceled) return;
    setImageUris((current) => [...current, result.assets[0].uri]);
  };

  const handleAddPhoto = () => {
    Alert.alert('Adicionar foto', undefined, [
      { text: 'Tirar foto', onPress: () => handlePickPhoto('camera') },
      { text: 'Escolher da galeria', onPress: () => handlePickPhoto('gallery') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const handleRemovePhoto = (uri: string) => {
    setImageUris((current) => current.filter((item) => item !== uri));
  };

  const handleContinue = () => {
    if (!title.trim()) {
      setError('Dá um título pra oferta.');
      return;
    }

    setError(null);
    const remotePhotoUrls = imageUris.filter((uri) => uri.startsWith('http'));
    const localPhotoUris = imageUris.filter((uri) => !uri.startsWith('http'));
    router.replace({
      pathname: '/(tabs)',
      params: {
        placingListing: '1',
        listingType,
        plantId: plantId ?? '',
        title: title.trim(),
        description: description.trim(),
        photoUrls: JSON.stringify(remotePhotoUrls),
        photoUris: JSON.stringify(localPhotoUris),
        shareToCommunity: shareToCommunity ? '1' : '0',
      },
    });
  };

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + Metrics.spacing.xl }}
      keyboardShouldPersistTaps="handled"
      bottomOffset={Metrics.spacing.lg}
    >
      <ScreenContent>
        <Card style={styles.section}>
          <SectionTitle>Fotos</SectionTitle>
          <PhotoGrid
            photoUrls={imageUris}
            onAdd={handleAddPhoto}
            onRemove={handleRemovePhoto}
            max={MAX_LISTING_PHOTOS}
          />
        </Card>

        <Card style={styles.section}>
          <SectionTitle>Tipo de oferta</SectionTitle>
          <PillSelector options={LISTING_TYPES} value={listingType} onChange={setListingType} />
        </Card>

        {plants.length > 0 && (
          <Card style={styles.section}>
            <SectionTitle>Alguma das suas plantas? (opcional)</SectionTitle>
            <PlantPickerRow plants={plants} selectedId={plantId} onSelect={handleSelectPlant} />
          </Card>
        )}

        <FormField label="Título" value={title} onChangeText={setTitle} placeholder="Muda de Costela-de-adão" />

        <FormField
          label="Descrição (opcional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Conte mais sobre a planta e o combinado de retirada"
          multiline
        />

        <ShareToCommunityToggle
          value={shareToCommunity}
          onValueChange={setShareToCommunity}
          description="Compartilha essa oferta também no feed da Comunidade."
        />

        <FormError>{error}</FormError>

        <SubmitButton label="Escolher local no mapa" onPress={handleContinue} />
      </ScreenContent>
    </KeyboardAwareScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    section: {
      marginBottom: Metrics.spacing.lg,
    },
  });
