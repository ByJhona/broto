import { Stack } from 'expo-router';
import { themedStackScreenOptions } from '@/theme';

export default function PlantLayout() {
  return (
    <Stack screenOptions={themedStackScreenOptions}>
      <Stack.Screen name="[id]" options={{ title: '' }} />
    </Stack>
  );
}
