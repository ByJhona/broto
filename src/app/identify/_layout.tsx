import { Stack } from 'expo-router';
import { useThemedStackScreenOptions } from '@/theme';

export default function IdentifyLayout() {
  const screenOptions = useThemedStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="result" options={{ title: 'Identificação' }} />
    </Stack>
  );
}
