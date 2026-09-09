import { Stack } from 'expo-router';
import { useThemedStackScreenOptions } from '@/theme';

export default function DiagnoseLayout() {
  const screenOptions = useThemedStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ title: 'Diagnósticos' }} />
      <Stack.Screen name="result" options={{ title: 'Diagnóstico' }} />
    </Stack>
  );
}
