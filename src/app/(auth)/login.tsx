import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Mail from 'lucide-react-native/icons/mail';
import { Metrics } from '@/theme';
import { useTranslation } from '@/i18n';
import { AuthLayout, Button, GoogleIcon } from '@/components';
import { EmailLoginForm } from '@/components/auth/EmailLoginForm';
import { useGoogleSignIn } from '@/components/auth/useGoogleSignIn';
import { useNetworkStatus } from '@/hooks';

export default function LoginScreen() {
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
      showLegalNotice
      footerLink={{ label: t('noAccountSignupLink'), href: '/(auth)/signup' }}
    >
      <Button
        label={t('continueWithGoogle')}
        variant="secondary"
        icon={GoogleIcon}
        onPress={handleGoogleSignIn}
        loading={isGoogleSubmitting}
        disabled={isOffline}
      />

      {isEmailFormOpen ? (
        <View style={styles.emailForm}>
          <EmailLoginForm disabled={isOffline || isGoogleSubmitting} />
        </View>
      ) : (
        <Button
          label={t('continueWithEmail')}
          variant="secondary"
          icon={Mail}
          onPress={() => setIsEmailFormOpen(true)}
          style={styles.emailButton}
        />
      )}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  emailButton: {
    marginTop: Metrics.spacing.md,
  },
  emailForm: {
    marginTop: Metrics.spacing.lg,
  },
});
