import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ASKED_KEY = '@broto/exact_alarm_asked';

export async function requestExactAlarmAccessOnce(): Promise<void> {
  if (Platform.OS !== 'android') return;

  const alreadyAsked = await AsyncStorage.getItem(ASKED_KEY);
  if (alreadyAsked) return;
  await AsyncStorage.setItem(ASKED_KEY, 'true');

  try {
    await Linking.sendIntent('android.settings.REQUEST_SCHEDULE_EXACT_ALARM');
  } catch {}
}
