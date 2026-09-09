import { Stack } from 'expo-router';
import { useThemedStackScreenOptions } from '@/theme';

export default function TaskLayout() {
  const screenOptions = useThemedStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="new" options={{ title: 'Novo lembrete' }} />
    </Stack>
  );
}
