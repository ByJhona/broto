import { Stack } from 'expo-router';
import { useThemedStackScreenOptions } from '@/theme';
import { useTranslation } from '@/i18n';

export default function EventLayout() {
  const screenOptions = useThemedStackScreenOptions();
  const { t } = useTranslation('event');
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="new" options={{ title: t('newEventTitle') }} />
      <Stack.Screen name="list" options={{ title: t('eventsListTitle') }} />
      <Stack.Screen name="[id]" options={{ title: t('eventDetailTitle') }} />
    </Stack>
  );
}
