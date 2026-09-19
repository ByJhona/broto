import { AlertHost } from '@/components/AlertHost';
import { ToastHost } from '@/components/ToastHost';
import { useAuth } from '@/hooks';
import { i18n, LanguageProvider, useTranslation } from '@/i18n';
import { checkForAppUpdate } from '@/services/appVersion';
import { registerCareTaskNotificationHandlers } from '@/services/careTasks';
import {
  CATALOG_STALE_TIME,
  CREDIT_COSTS_QUERY_KEY,
  CREDIT_PACKS_QUERY_KEY,
  getCreditCosts,
  getCreditPacks,
  getPlanCatalog,
  PLAN_CATALOG_QUERY_KEY,
} from '@/services/credits';
import { registerNotificationTapHandler } from '@/services/notificationNavigation';
import { registerPushToken, watchPushTokenRefresh } from '@/services/pushTokens';
import { queryClient } from '@/services/queryClient';
import { AuthProvider, NotificationsProvider } from '@/store';
import { ThemeProvider, useColors, useAppTheme, useThemedStackScreenOptions, type ThemeColors } from '@/theme';
import { Alert } from '@/utils';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, Linking, StatusBar, StyleSheet, View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';

function RootNavigator() {
  const { session, isLoading } = useAuth();
  const colors = useColors();
  const { scheme } = useAppTheme();
  const { t } = useTranslation('nav');
  const searchScreenOptions = useThemedStackScreenOptions();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  useEffect(() => {
    registerCareTaskNotificationHandlers();
    registerNotificationTapHandler();
    watchPushTokenRefresh();

    checkForAppUpdate().then((result) => {
      if (!result?.updateAvailable) return;

      Alert.alert(i18n.t('nav:updateAvailableTitle'), i18n.t('nav:updateAvailableMessage'), [
        { text: i18n.t('nav:updateLater'), style: 'cancel' },
        { text: i18n.t('nav:updateNow'), onPress: () => Linking.openURL(result.storeUrl) },
      ]);
    });
  }, []);

  useEffect(() => {
    if (!session) return;
    registerPushToken();
    // Warms the plans-screen cache so it shows cards instantly instead of a
    // skeleton the first time the user navigates there in this session.
    queryClient.query({ queryKey: PLAN_CATALOG_QUERY_KEY, queryFn: getPlanCatalog, staleTime: CATALOG_STALE_TIME }).catch(() => {});
    queryClient.query({ queryKey: CREDIT_PACKS_QUERY_KEY, queryFn: getCreditPacks, staleTime: CATALOG_STALE_TIME }).catch(() => {});
    queryClient.query({ queryKey: CREDIT_COSTS_QUERY_KEY, queryFn: getCreditCosts, staleTime: CATALOG_STALE_TIME }).catch(() => {});
  }, [session]);

  const statusBar = <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />;

  if (isLoading) {
    return (
      <View style={styles.loading}>
        {statusBar}
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <NotificationsProvider>
      {statusBar}
      <Stack>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ headerShown: false }} />
          <Stack.Screen name="plant" options={{ headerShown: false }} />
          <Stack.Screen name="garden" options={{ headerShown: false }} />
          <Stack.Screen name="group" options={{ headerShown: false }} />
          <Stack.Screen name="post" options={{ headerShown: false }} />
          <Stack.Screen name="event" options={{ headerShown: false }} />
          <Stack.Screen name="identify" options={{ headerShown: false }} />
          <Stack.Screen name="listing" options={{ headerShown: false }} />
          <Stack.Screen name="task" options={{ headerShown: false }} />
          <Stack.Screen name="diagnose" options={{ headerShown: false }} />
          <Stack.Screen name="search" options={{ ...searchScreenOptions, title: t('search') }} />
          <Stack.Screen name="messages" options={{ ...searchScreenOptions, title: t('messages') }} />
          <Stack.Screen name="chat" options={{ ...searchScreenOptions, title: t('chat') }} />
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
    <KeyboardProvider>
      <LanguageProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </LanguageProvider>
    </KeyboardProvider>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    loading: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
  });
