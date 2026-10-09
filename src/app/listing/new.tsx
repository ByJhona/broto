import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Metrics, Overlays, type ThemeColors, useThemedStyles } from '@/theme';
import { useTranslation } from '@/i18n';
import { FloatingScreenControls, InfoSection, PhotoBadge, PlantPickerRow, PriceField } from '@/components';
import { ComposeFooter, COMPOSE_FOOTER_CLEARANCE } from '@/components/compose/ComposeFooter';
import { ComposeTitleBlock } from '@/components/compose/ComposeTitleBlock';
import { ShareToCommunityGroup } from '@/components/compose/ShareToCommunityGroup';
import { DraftPhotoGallery } from '@/components/DraftPhotoGallery';
import { ListingTypePicker } from '@/components/offers/ListingTypePicker';
import { useActiveRestriction, useCredits, usePlants } from '@/hooks';
import { formatPrice, LISTING_TYPE_COLORS, LISTING_TYPE_ICONS, listingShareVerb, listingTypeLabel, pickPhoto } from '@/utils';
import { LISTING_TYPE, type ListingType } from '@/types';

const FREE_PLAN_MAX_PHOTOS = 3;

type PreviewBadgesProps = {
  listingType: ListingType;
  priceCents: number | null;
};

function PreviewBadges({ listingType, priceCents }: Readonly<PreviewBadgesProps>) {
  return (
    <>
      <PhotoBadge
        icon={LISTING_TYPE_ICONS[listingType]}
        label={listingTypeLabel(listingType)}
        color={LISTING_TYPE_COLORS[listingType]}
      />
      {priceCents ? <PhotoBadge label={formatPrice(priceCents)} color={Overlays.scrim} /> : null}
    </>
  );
}

function initialListingType(type: string | undefined): ListingType {
  return Object.values(LISTING_TYPE).find((value) => value === type) ?? LISTING_TYPE.DONATION;
}

export default function NewListingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('listing');
  const params = useLocalSearchParams<{ plantId?: string; type?: string }>();
  const { plants } = usePlants();
  const initialPlant = plants.find((item) => item.id === params.plantId) ?? null;
  const { credits } = useCredits();
  const maxPhotos = credits?.maxListingPhotos ?? FREE_PLAN_MAX_PHOTOS;

  const [listingType, setListingType] = useState<ListingType>(() => initialListingType(params.type));
  const [plantId, setPlantId] = useState<string | null>(initialPlant?.id ?? null);
  const [title, setTitle] = useState(initialPlant?.name ?? '');
  const [description, setDescription] = useState('');
  const [priceCents, setPriceCents] = useState(0);
  const [imageUris, setImageUris] = useState<string[]>(initialPlant?.photoUrl ? [initialPlant.photoUrl] : []);
  const isSale = listingType === LISTING_TYPE.SALE;
  const [shareToCommunity, setShareToCommunity] = useState(true);
  const [communityCaption, setCommunityCaption] = useState('');
  const [error, setError] = useState<string | null>(null);
  const restriction = useActiveRestriction();

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
    <View style={styles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + COMPOSE_FOOTER_CLEARANCE }}
        keyboardShouldPersistTaps="handled"
        bottomOffset={COMPOSE_FOOTER_CLEARANCE}
      >
        <DraftPhotoGallery
          photoUris={imageUris}
          max={maxPhotos}
          hint={t('photoHint', { max: maxPhotos })}
          placeholderIcon={LISTING_TYPE_ICONS[listingType]}
          placeholderColor={LISTING_TYPE_COLORS[listingType]}
          overlay={<PreviewBadges listingType={listingType} priceCents={isSale ? priceCents : null} />}
          onAdd={handleAddPhoto}
          onRemove={handleRemovePhoto}
        />

        <View style={styles.content}>
          <ComposeTitleBlock
            title={title}
            onChangeTitle={setTitle}
            titleLabel={t('titleLabel')}
            titlePlaceholder={t('titlePlaceholder')}
            description={description}
            onChangeDescription={setDescription}
            descriptionLabel={t('descriptionLabel')}
            descriptionPlaceholder={t('descriptionPlaceholder')}
          />

          <InfoSection title={t('listingTypeSectionTitle')}>
            <ListingTypePicker value={listingType} onChange={setListingType} />
            {isSale ? (
              <View style={styles.priceField}>
                <PriceField label={t('priceLabel')} cents={priceCents} onChangeCents={setPriceCents} />
              </View>
            ) : null}
          </InfoSection>

          {plants.length > 0 ? (
            <InfoSection title={t('yourPlantsSectionTitle')}>
              <PlantPickerRow plants={plants} selectedId={plantId} onSelect={handleSelectPlant} />
            </InfoSection>
          ) : null}

          <ShareToCommunityGroup
            value={shareToCommunity}
            onValueChange={setShareToCommunity}
            description={t('shareToCommunityDescription')}
            caption={communityCaption}
            onChangeCaption={setCommunityCaption}
            captionLabel={t('communityCommentLabel')}
            captionPlaceholder={`${listingShareVerb(listingType)} "${title || t('yourPlantFallback')}"!`}
          />
        </View>
      </KeyboardAwareScrollView>

      <ComposeFooter label={t('chooseLocationCta')} onPress={handleContinue} error={restriction ?? error} disabled={restriction !== null} />
      <FloatingScreenControls />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      ...Metrics.layout.centeredContent,
      paddingHorizontal: Metrics.spacing.lg,
      paddingTop: Metrics.spacing.lg,
    },
    priceField: {
      marginTop: Metrics.spacing.md,
    },
  });
