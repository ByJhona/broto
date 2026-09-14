import { Stack } from 'expo-router';
import { useThemedStackScreenOptions } from '@/theme';
import { useTranslation } from '@/i18n';

export default function DiagnoseLayout() {
  const screenOptions = useThemedStackScreenOptions();
  const { t } = useTranslation('diagnose');
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ title: t('historyTitle') }} />
      <Stack.Screen name="result" options={{ title: t('resultTitle') }} />
    </Stack>
  );
}
