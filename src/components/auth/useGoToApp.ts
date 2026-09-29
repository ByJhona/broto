import { useRouter } from 'expo-router';

export function useGoToApp() {
  const router = useRouter();
  return () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };
}
