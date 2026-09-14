import { Stack } from 'expo-router';
import { useThemedStackScreenOptions } from '@/theme';
import { useTranslation } from '@/i18n';

export default function PostLayout() {
  const screenOptions = useThemedStackScreenOptions();
  const { t } = useTranslation('post');
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="[id]" options={{ title: t('postTitle') }} />
    </Stack>
  );
}
