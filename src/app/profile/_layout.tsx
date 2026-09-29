import { Stack } from 'expo-router';
import { useThemedStackScreenOptions } from '@/theme';
import { useTranslation } from '@/i18n';

export default function ProfileLayout() {
  const screenOptions = useThemedStackScreenOptions();
  const { t } = useTranslation('profile');
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="settings" options={{ headerShown: false, title: t('settingsTitle') }} />
      <Stack.Screen name="[id]" options={{ headerShown: false, title: t('profileTitle') }} />
      <Stack.Screen name="edit" options={{ title: t('editProfileTitle') }} />
      <Stack.Screen name="notifications" options={{ headerShown: false, title: t('notificationsTitle') }} />
      <Stack.Screen name="privacy" options={{ title: t('privacyTitle') }} />
      <Stack.Screen name="plans" options={{ headerShown: false, title: t('plansTitle') }} />
      <Stack.Screen name="badges" options={{ title: t('badge:catalogTitle') }} />
      <Stack.Screen name="help" options={{ title: t('helpTitle') }} />
    </Stack>
  );
}
