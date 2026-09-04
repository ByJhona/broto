import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export type AppVersionCheck = {
  updateAvailable: boolean;
  storeUrl: string;
};

export async function checkForAppUpdate(): Promise<AppVersionCheck | null> {
  if (Platform.OS !== 'android') return null;

  const currentVersionCode = Constants.expoConfig?.android?.versionCode;
  if (!currentVersionCode) return null;

  const { data, error } = await supabase
    .from('app_versions')
    .select('latest_version_code, store_url')
    .eq('platform', 'android')
    .maybeSingle();

  if (error || !data) return null;

  return {
    updateAvailable: currentVersionCode < data.latest_version_code,
    storeUrl: data.store_url,
  };
}
