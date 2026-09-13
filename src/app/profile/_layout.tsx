import { Stack } from 'expo-router';
import { useThemedStackScreenOptions } from '@/theme';

export default function ProfileLayout() {
  const screenOptions = useThemedStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="settings" options={{ title: 'Configurações' }} />
      <Stack.Screen name="[id]" options={{ title: 'Perfil' }} />
      <Stack.Screen name="edit" options={{ title: 'Editar perfil' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notificações' }} />
      <Stack.Screen name="privacy" options={{ title: 'Privacidade e segurança' }} />
      <Stack.Screen name="plans" options={{ title: 'Planos' }} />
    </Stack>
  );
}
