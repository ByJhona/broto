import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Mail from 'lucide-react-native/icons/mail';
import { Metrics } from '@/theme';
import { useTranslation } from '@/i18n';
import { AuthLayout, Button, GoogleIcon } from '@/components';
import { EmailSignupForm } from '@/components/auth/EmailSignupForm';
import { useGoogleSignIn } from '@/components/auth/useGoogleSignIn';
import { useNetworkStatus } from '@/hooks';

export default function SignupScreen() {
  const { t } = useTranslation('auth');
  const { isOffline } = useNetworkStatus();
  const { isGoogleSubmitting, handleGoogleSignIn } = useGoogleSignIn();
  const [isEmailFormOpen, setIsEmailFormOpen] = useState(false);

  return (
    <AuthLayout
      title={t('signupTitle')}
      subtitle={t('signupSubtitle')}
      isOffline={isOffline}
      backHref="/(auth)/login"
      offlineMessage={t('signupOfflineMessage')}
      showLegalNotice
      footerLink={{ label: t('haveAccountLoginLink'), href: '/(auth)/login' }}
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
          <EmailSignupForm disabled={isOffline || isGoogleSubmitting} />
        </View>
      ) : (
        <Button
          label={t('signupWithEmail')}
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
