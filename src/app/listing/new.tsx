import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { useTranslation } from '@/i18n';
import {
  Card,
  FormError,
  FormField,
  PhotoGrid,
  PillSelector,
  PlantPickerRow,
  PriceField,
  ScreenContent,
  SectionTitle,
  ShareToCommunityToggle,
  SubmitButton,
} from '@/components';
import { useCredits, usePlants } from '@/hooks';
import { listingShareVerb, listingTypes, pickPhoto } from '@/utils';
import { LISTING_TYPE, type ListingType } from '@/types';

const FREE_PLAN_MAX_PHOTOS = 3;

export default function NewListingScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation('listing');
  const { plants } = usePlants();
  const { credits } = useCredits();
  const maxPhotos = credits?.maxListingPhotos ?? FREE_PLAN_MAX_PHOTOS;
  const listingTypeOptions = listingTypes();

  const [listingType, setListingType] = useState<ListingType>(LISTING_TYPE.DONATION);
  const [plantId, setPlantId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceCents, setPriceCents] = useState(0);
  const [imageUris, setImageUris] = useState<string[]>([]);
  const isSale = listingType === LISTING_TYPE.SALE;
  const [shareToCommunity, setShareToCommunity] = useState(true);
  const [communityCaption, setCommunityCaption] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSelectPlant = (selectedPlantId: string | null) => {
    const plant = plants.find((item) => item.id === selectedPlantId) ?? null;
    setPlantId(plant?.id ?? null);
    if (plant) {
      setTitle(plant.name);
      setImageUris(plant.photoUrl ? [plant.photoUrl] : []);
    }
  };

  const handleAddPhoto = async () => {
    const uri = await pickPhoto();
    if (uri) setImageUris((current) => [...current, uri]);
  };

  const handleRemovePhoto = (uri: string) => {
    setImageUris((current) => current.filter((item) => item !== uri));
  };

  const handleContinue = () => {
    if (!title.trim()) {
      setError(t('titleRequired'));
      return;
    }

    if (isSale && priceCents <= 0) {
      setError(t('priceRequired'));
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
        priceCents: isSale ? String(priceCents) : '',
        shareToCommunity: shareToCommunity ? '1' : '0',
        communityCaption: communityCaption.trim(),
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
          <SectionTitle>{t('photosSectionTitle')}</SectionTitle>
          <PhotoGrid
            photoUrls={imageUris}
            onAdd={handleAddPhoto}
            onRemove={handleRemovePhoto}
            max={maxPhotos}
          />
        </Card>

        <Card style={styles.section}>
          <SectionTitle>{t('listingTypeSectionTitle')}</SectionTitle>
          <PillSelector options={listingTypeOptions} value={listingType} onChange={setListingType} />

          {isSale ? (
            <View style={styles.priceField}>
              <PriceField label={t('priceLabel')} cents={priceCents} onChangeCents={setPriceCents} />
            </View>
          ) : null}
        </Card>

        {plants.length > 0 && (
          <Card style={styles.section}>
            <SectionTitle>{t('yourPlantsSectionTitle')}</SectionTitle>
            <PlantPickerRow plants={plants} selectedId={plantId} onSelect={handleSelectPlant} />
          </Card>
        )}

        <FormField label={t('titleLabel')} value={title} onChangeText={setTitle} placeholder={t('titlePlaceholder')} />

        <FormField
          label={t('descriptionLabel')}
          value={description}
          onChangeText={setDescription}
          placeholder={t('descriptionPlaceholder')}
          multiline
        />

        <ShareToCommunityToggle
          value={shareToCommunity}
          onValueChange={setShareToCommunity}
          description={t('shareToCommunityDescription')}
        />

        {shareToCommunity ? (
          <FormField
            label={t('communityCommentLabel')}
            value={communityCaption}
            onChangeText={setCommunityCaption}
            placeholder={`${listingShareVerb(listingType)} "${title || t('yourPlantFallback')}"!`}
            multiline
          />
        ) : null}

        <FormError>{error}</FormError>

        <SubmitButton label={t('chooseLocationCta')} onPress={handleContinue} />
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
    priceField: {
      marginTop: Metrics.spacing.md,
    },
  });
