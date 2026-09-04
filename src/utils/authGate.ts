import type { useRouter } from 'expo-router';
import { Alert } from './alert';

type Router = ReturnType<typeof useRouter>;

export function requireLogin(router: Router, isAuthenticated: boolean, message: string): boolean {
  if (isAuthenticated) return true;

  Alert.alert('Entre na sua conta', message, [
    { text: 'Agora não', style: 'cancel' },
    { text: 'Entrar', onPress: () => router.push('/(auth)/login') },
  ]);

  return false;
}
