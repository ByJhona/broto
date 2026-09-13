import { Stack } from 'expo-router';
import { useThemedStackScreenOptions } from '@/theme';

export default function ListingLayout() {
  const screenOptions = useThemedStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="new" options={{ title: 'Nova oferta' }} />
      <Stack.Screen name="list" options={{ title: 'Ofertas' }} />
      <Stack.Screen name="[id]" options={{ title: 'Oferta' }} />
    </Stack>
  );
}
