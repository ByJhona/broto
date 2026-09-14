import type { useRouter } from 'expo-router';
import { i18n } from '@/i18n';
import { Alert } from './alert';

type Router = ReturnType<typeof useRouter>;

export function requireLogin(router: Router, isAuthenticated: boolean, message: string): boolean {
  if (isAuthenticated) return true;

  Alert.alert(i18n.t('common:signInRequiredTitle'), message, [
    { text: i18n.t('common:notNow'), style: 'cancel' },
    { text: i18n.t('common:signIn'), onPress: () => router.push('/(auth)/login') },
  ]);

  return false;
}
