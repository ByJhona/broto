import { Stack } from 'expo-router';
import { useThemedStackScreenOptions } from '@/theme';
import { useTranslation } from '@/i18n';

export default function TaskLayout() {
  const screenOptions = useThemedStackScreenOptions();
  const { t } = useTranslation('task');
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="new" options={{ title: t('newReminderTitle') }} />
    </Stack>
  );
}
