import { Stack } from 'expo-router';
import { themedStackScreenOptions } from '@/theme';

export default function IdentifyLayout() {
  return (
    <Stack screenOptions={themedStackScreenOptions}>
      <Stack.Screen name="result" options={{ title: 'Identificação' }} />
    </Stack>
  );
}
