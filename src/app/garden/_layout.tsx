import { Stack } from 'expo-router';
import { useThemedStackScreenOptions } from '@/theme';
import { useTranslation } from '@/i18n';

export default function GardenLayout() {
  const screenOptions = useThemedStackScreenOptions();
  const { t } = useTranslation('garden');
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="add" options={{ headerShown: false, title: t('addPlantTitle') }} />
    </Stack>
  );
}
