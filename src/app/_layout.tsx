import { AlertHost, ToastHost } from '@/components';
import { useAuth } from '@/hooks';
import {
  checkForAppUpdate,
  queryClient,
  registerCareTaskNotificationHandlers,
  registerNotificationTapHandler,
  registerPushToken,
  watchPushTokenRefresh,
} from '@/services';
import { AuthProvider, NotificationsProvider } from '@/store';
import { Colors, themedStackScreenOptions } from '@/theme';
import { Alert } from '@/utils';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';

function RootNavigator() {
  const { session, isLoading } = useAuth();

  useEffect(() => {
    registerCareTaskNotificationHandlers();
    registerNotificationTapHandler();
    watchPushTokenRefresh();

    checkForAppUpdate().then((result) => {
      if (!result?.updateAvailable) return;

      Alert.alert('Atualização disponível', 'Uma nova versão do broto está disponível na loja.', [
        { text: 'Agora não', style: 'cancel' },
        { text: 'Atualizar', onPress: () => Linking.openURL(result.storeUrl) },
      ]);
    });
  }, []);

  useEffect(() => {
    if (session) registerPushToken();
  }, [session]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <NotificationsProvider>
      <Stack>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ headerShown: false }} />
          <Stack.Screen name="plant" options={{ headerShown: false }} />
          <Stack.Screen name="post" options={{ headerShown: false }} />
          <Stack.Screen name="identify" options={{ headerShown: false }} />
          <Stack.Screen name="task" options={{ headerShown: false }} />
          <Stack.Screen name="diagnose" options={{ headerShown: false }} />
          <Stack.Screen name="search" options={{ ...themedStackScreenOptions, title: 'Buscar' }} />
        </Stack.Protected>

        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
      <AlertHost />
      <ToastHost />
    </NotificationsProvider>
  );
}

export default function Layout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
