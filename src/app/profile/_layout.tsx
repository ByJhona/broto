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
      <Stack.Screen name="edit" options={{ headerShown: false, title: t('editProfileTitle') }} />
      <Stack.Screen name="notifications" options={{ headerShown: false, title: t('notificationsTitle') }} />
      <Stack.Screen name="privacy" options={{ headerShown: false, title: t('privacyTitle') }} />
      <Stack.Screen name="plans" options={{ headerShown: false, title: t('plansTitle') }} />
      <Stack.Screen name="badges" options={{ headerShown: false, title: t('badge:catalogTitle') }} />
      <Stack.Screen name="help" options={{ headerShown: false, title: t('helpTitle') }} />
    </Stack>
  );
}
