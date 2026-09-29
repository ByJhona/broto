import { Stack } from 'expo-router';
import { useThemedStackScreenOptions } from '@/theme';
import { useTranslation } from '@/i18n';

export default function EventLayout() {
  const screenOptions = useThemedStackScreenOptions();
  const { t } = useTranslation('event');
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="new" options={{ headerShown: false, title: t('newEventTitle') }} />
      <Stack.Screen name="[id]" options={{ headerShown: false, title: t('eventDetailTitle') }} />
    </Stack>
  );
}
