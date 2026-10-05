import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Mail from 'lucide-react-native/icons/mail';
import { Metrics, Opacity, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { AuthFooterLink, AuthLayout, GoogleSignInButton } from '@/components';
import { EmailLoginForm } from '@/components/auth/EmailLoginForm';
import { useGoogleSignIn } from '@/components/auth/useGoogleSignIn';
import { useNetworkStatus } from '@/hooks';

export default function LoginScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('auth');
  const { isOffline } = useNetworkStatus();
  const { isGoogleSubmitting, handleGoogleSignIn } = useGoogleSignIn();
  const [isEmailFormOpen, setIsEmailFormOpen] = useState(false);

  return (
    <AuthLayout
      title={t('loginTitle')}
      subtitle={t('loginSubtitle')}
      isOffline={isOffline}
      offlineMessage={t('loginOfflineMessage')}
      showMosaic
    >
      <GoogleSignInButton
        label={t('continueWithGoogle')}
        onPress={handleGoogleSignIn}
        loading={isGoogleSubmitting}
        disabled={isOffline}
      />

      {isEmailFormOpen ? (
        <View style={styles.emailForm}>
          <EmailLoginForm disabled={isOffline || isGoogleSubmitting} />
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.emailButton, pressed && styles.pressed]}
          onPress={() => setIsEmailFormOpen(true)}
        >
          <Mail size={Metrics.icon.small} color={colors.foreground} strokeWidth={Metrics.icon.stroke.regular} />
          <Text style={styles.emailButtonText}>{t('continueWithEmail')}</Text>
        </Pressable>
      )}

      <AuthFooterLink href="/(auth)/signup" label={t('noAccountSignupLink')} />
    </AuthLayout>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    emailButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Metrics.spacing.sm,
      paddingVertical: Metrics.spacing.md,
      marginTop: Metrics.spacing.sm,
    },
    pressed: {
      opacity: Opacity.pressed,
    },
    emailButtonText: {
      ...Typography.headingMedium,
      color: colors.foreground,
    },
    emailForm: {
      marginTop: Metrics.spacing.lg,
    },
  });
