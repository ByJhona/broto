import { useState } from 'react';
import Leaf from 'lucide-react-native/icons/leaf';
import { useTranslation } from '@/i18n';
import { addPlantPhoto, MAX_PLANT_PHOTOS, removePlantPhoto } from '@/services';
import type { Plant } from '@/types';
import { confirm, pickPhoto, Toast } from '@/utils';
import { PhotoPager } from '../PhotoPager';
import { AddPhotoPage, RemovePhotoButton } from '../PhotoPagerControls';

type PlantGalleryProps = {
  plant: Plant;
  onPhotoUrlsChange: (photoUrls: string[]) => void;
};

export function PlantGallery({ plant, onPhotoUrlsChange }: Readonly<PlantGalleryProps>) {
  const { t } = useTranslation(['plant', 'common']);
  const [isUploading, setIsUploading] = useState(false);
  const canAddPhoto = plant.photoUrls.length < MAX_PLANT_PHOTOS;

  const handleAddPhoto = async () => {
    const uri = await pickPhoto();
    if (!uri) return;

    setIsUploading(true);
    try {
      const updated = await addPlantPhoto(plant.id, uri);
      onPhotoUrlsChange(updated.photoUrls);
    } catch {
      Toast.error(t('addPhotoError'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = async (photoUrl: string) => {
    const confirmed = await confirm(t('removePhotoTitle'), t('removePhotoMessage'), {
      confirmLabel: t('common:delete'),
      destructive: true,
    });
    if (!confirmed) return;

    try {
      const updated = await removePlantPhoto(plant.id, photoUrl);
      onPhotoUrlsChange(updated.photoUrls);
    } catch {
      Toast.error(t('removePhotoError'));
    }
  };

  return (
    <PhotoPager
      photoUrls={plant.photoUrls}
      placeholderIcon={Leaf}
      fullWidth
      recyclingKey={plant.id}
      renderPhotoAction={(url) => <RemovePhotoButton onPress={() => handleRemovePhoto(url)} />}
      trailingPage={
        canAddPhoto ? (
          <AddPhotoPage
            hint={t('addPhotoHint', { max: MAX_PLANT_PHOTOS })}
            isUploading={isUploading}
            onPress={handleAddPhoto}
          />
        ) : undefined
      }
    />
  );
}
