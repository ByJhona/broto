import * as ImagePicker from 'expo-image-picker';
import { i18n } from '@/i18n';
import { ActionSheet } from './actionSheet';

export const PHOTO_QUALITY = 0.7;

async function launchPicker(source: 'camera' | 'gallery'): Promise<string | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: PHOTO_QUALITY })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: PHOTO_QUALITY });

  return result.canceled ? null : result.assets[0].uri;
}

export function pickPhoto(title?: string): Promise<string | null> {
  return new Promise((resolve) => {
    ActionSheet.show(title ?? i18n.t('common:addPhoto'), [
      { text: i18n.t('common:takePhoto'), onPress: () => resolve(launchPicker('camera')) },
      { text: i18n.t('common:chooseFromGallery'), onPress: () => resolve(launchPicker('gallery')) },
      { text: i18n.t('common:cancel'), style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}
