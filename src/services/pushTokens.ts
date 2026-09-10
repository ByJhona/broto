import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { getNotificationsModule } from './notificationsModule';
import { supabase } from './supabase';

let isRegistering = false;

export async function registerPushToken(): Promise<void> {
  if (!Device.isDevice) return;
  if (isRegistering) return;

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

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) return;

    const { error } = await supabase.from('push_tokens').upsert({ user_id: user.id, token }, { onConflict: 'token' });
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
    registerPushToken();
  });
}
