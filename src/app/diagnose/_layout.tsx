import { Stack } from 'expo-router';
import { themedStackScreenOptions } from '@/theme';

export default function DiagnoseLayout() {
  return (
    <Stack screenOptions={themedStackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Diagnósticos' }} />
      <Stack.Screen name="result" options={{ title: 'Diagnóstico' }} />
    </Stack>
  );
}
