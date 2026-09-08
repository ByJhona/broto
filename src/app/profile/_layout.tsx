import { Stack } from 'expo-router';
import { themedStackScreenOptions } from '@/theme';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={themedStackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Meu perfil' }} />
      <Stack.Screen name="[id]" options={{ title: 'Perfil' }} />
      <Stack.Screen name="edit" options={{ title: 'Editar perfil' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notificações' }} />
      <Stack.Screen name="privacy" options={{ title: 'Privacidade e segurança' }} />
      <Stack.Screen name="plans" options={{ title: 'Planos' }} />
    </Stack>
  );
}
