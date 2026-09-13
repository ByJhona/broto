import { Stack } from 'expo-router';
import { useThemedStackScreenOptions } from '@/theme';

export default function EventLayout() {
  const screenOptions = useThemedStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="new" options={{ title: 'Novo evento' }} />
      <Stack.Screen name="list" options={{ title: 'Eventos' }} />
      <Stack.Screen name="[id]" options={{ title: 'Evento' }} />
    </Stack>
  );
}
