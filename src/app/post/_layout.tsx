import { Stack } from 'expo-router';
import { useThemedStackScreenOptions } from '@/theme';

export default function PostLayout() {
  const screenOptions = useThemedStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="[id]" options={{ title: 'Publicação' }} />
    </Stack>
  );
}
