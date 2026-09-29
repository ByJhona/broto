import { Stack } from 'expo-router';
import { useThemedStackScreenOptions } from '@/theme';
import { useTranslation } from '@/i18n';

export default function PostLayout() {
  const screenOptions = useThemedStackScreenOptions();
  const { t } = useTranslation('post');
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="new" options={{ headerShown: false, title: t('newPostTitle') }} />
      <Stack.Screen name="[id]" options={{ headerShown: false, title: t('postTitle') }} />
    </Stack>
  );
}
