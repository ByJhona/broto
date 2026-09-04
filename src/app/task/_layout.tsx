import { Stack } from 'expo-router';
import { themedStackScreenOptions } from '@/theme';

export default function TaskLayout() {
  return (
    <Stack screenOptions={themedStackScreenOptions}>
      <Stack.Screen name="new" options={{ title: 'Novo lembrete' }} />
    </Stack>
  );
}
