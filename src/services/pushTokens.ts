import { Platform } from 'react-native';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { getNotificationsModule } from './notificationsModule';
import { getCurrentUserId, supabase } from './supabase';

let isRegistering = false;

async function getDeviceId(): Promise<string | null> {
  if (Platform.OS === 'android') return Application.getAndroidId();
  return Application.getIosIdForVendorAsync();
}

export async function registerPushToken(): Promise<void> {
  if (!Device.isDevice) return;
  if (isRegistering) {
    console.log('[push] registerPushToken ignorado, já em andamento');
    return;
  }

  const notifications = await getNotificationsModule();
  if (!notifications) return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return;

  isRegistering = true;
  try {
    const permission = await notifications.getPermissionsAsync();
    const granted = permission.granted || (await notifications.requestPermissionsAsync()).granted;
    if (!granted) return;

    const { data: token } = await notifications.getExpoPushTokenAsync({ projectId });

    const userId = await getCurrentUserId();
    if (!userId) return;

    const deviceId = await getDeviceId();
    const { error } = await supabase.rpc('register_push_token', { p_token: token, p_device_id: deviceId });
    if (error) {
      console.warn('[push] erro salvando token no Supabase:', error);
    }
  } catch (error) {
    console.warn('[push] erro inesperado registrando token:', error);
  } finally {
    isRegistering = false;
  }
}

export async function watchPushTokenRefresh(): Promise<void> {
  const notifications = await getNotificationsModule();
  if (!notifications) return;

  notifications.addPushTokenListener(() => {
    console.log('[push] addPushTokenListener disparou');
    registerPushToken();
  });
}

export async function unregisterPushToken(): Promise<void> {
  const deviceId = await getDeviceId();
  if (!deviceId) return;

  const { error } = await supabase.from('push_tokens').delete().eq('device_id', deviceId);
  if (error) console.warn('[push] erro removendo token do aparelho:', error);
}
