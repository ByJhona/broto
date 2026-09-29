import { Stack } from 'expo-router';
import { useThemedStackScreenOptions } from '@/theme';
import { useTranslation } from '@/i18n';

export default function ListingLayout() {
  const screenOptions = useThemedStackScreenOptions();
  const { t } = useTranslation('listing');
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="new" options={{ headerShown: false, title: t('newListingScreenTitle') }} />
      <Stack.Screen name="[id]" options={{ headerShown: false, title: t('listingDetailScreenTitle') }} />
    </Stack>
  );
}
