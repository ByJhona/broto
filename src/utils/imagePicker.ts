import * as ImagePicker from 'expo-image-picker';
import { i18n } from '@/i18n';
import { Alert } from './alert';

async function launchPicker(source: 'camera' | 'gallery'): Promise<string | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });

  return result.canceled ? null : result.assets[0].uri;
}

export function pickPhoto(title?: string): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.alert(title ?? i18n.t('common:addPhoto'), undefined, [
      { text: i18n.t('common:takePhoto'), onPress: () => resolve(launchPicker('camera')) },
      { text: i18n.t('common:chooseFromGallery'), onPress: () => resolve(launchPicker('gallery')) },
      { text: i18n.t('common:cancel'), style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}
