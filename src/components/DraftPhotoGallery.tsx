import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react-native';
import { PhotoPager } from './PhotoPager';
import { AddPhotoPage, RemovePhotoButton } from './PhotoPagerControls';

type DraftPhotoGalleryProps = {
  photoUris: string[];
  max: number;
  hint: string;
  placeholderIcon: LucideIcon;
  placeholderColor?: string;
  overlay?: ReactNode;
  onAdd: () => void;
  onRemove: (uri: string) => void;
};

export function DraftPhotoGallery({
  photoUris,
  max,
  hint,
  placeholderIcon,
  placeholderColor,
  overlay,
  onAdd,
  onRemove,
}: Readonly<DraftPhotoGalleryProps>) {
  const canAddPhoto = photoUris.length < max;

  return (
    <PhotoPager
      photoUrls={photoUris}
      placeholderIcon={placeholderIcon}
      placeholderColor={placeholderColor}
      fullWidth
      overlay={overlay}
      renderPhotoAction={(uri) => <RemovePhotoButton onPress={() => onRemove(uri)} />}
      trailingPage={canAddPhoto ? <AddPhotoPage hint={hint} onPress={onAdd} /> : undefined}
    />
  );
}
