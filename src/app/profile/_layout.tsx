import { Stack } from 'expo-router';
import { useThemedStackScreenOptions } from '@/theme';
import { useTranslation } from '@/i18n';

export default function ProfileLayout() {
  const screenOptions = useThemedStackScreenOptions();
  const { t } = useTranslation('profile');
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="settings" options={{ title: t('settingsTitle') }} />
      <Stack.Screen name="[id]" options={{ title: t('profileTitle') }} />
      <Stack.Screen name="edit" options={{ title: t('editProfileTitle') }} />
      <Stack.Screen name="notifications" options={{ title: t('notificationsTitle') }} />
      <Stack.Screen name="privacy" options={{ title: t('privacyTitle') }} />
      <Stack.Screen name="plans" options={{ title: t('plansTitle') }} />
    </Stack>
  );
}
