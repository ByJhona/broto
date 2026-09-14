import { Stack } from 'expo-router';
import { useThemedStackScreenOptions } from '@/theme';
import { useTranslation } from '@/i18n';

export default function IdentifyLayout() {
  const screenOptions = useThemedStackScreenOptions();
  const { t } = useTranslation('identify');
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="result" options={{ title: t('resultTitle') }} />
    </Stack>
  );
}
