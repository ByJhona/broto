import { Stack } from 'expo-router';
import { themedStackScreenOptions } from '@/theme';

export default function PostLayout() {
  return (
    <Stack screenOptions={themedStackScreenOptions}>
      <Stack.Screen name="[id]" options={{ title: 'Publicação' }} />
    </Stack>
  );
}
