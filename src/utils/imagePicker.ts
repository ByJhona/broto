import * as ImagePicker from 'expo-image-picker';
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

export function pickPhoto(title = 'Adicionar foto'): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.alert(title, undefined, [
      { text: 'Tirar foto', onPress: () => resolve(launchPicker('camera')) },
      { text: 'Escolher da galeria', onPress: () => resolve(launchPicker('gallery')) },
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}
