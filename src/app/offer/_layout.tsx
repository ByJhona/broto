import { Stack } from 'expo-router';
import { useThemedStackScreenOptions } from '@/theme';

export default function OfferLayout() {
  const screenOptions = useThemedStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
