import { useTranslation } from '@/i18n';
import { AuthDivider, AuthFooterLink, AuthLayout, GoogleSignInButton } from '@/components';
import { EmailSignupForm } from '@/components/auth/EmailSignupForm';
import { useGoogleSignIn } from '@/components/auth/useGoogleSignIn';
import { useNetworkStatus } from '@/hooks';

export default function SignupScreen() {
  const { t } = useTranslation('auth');
  const { isOffline } = useNetworkStatus();
  const { isGoogleSubmitting, handleGoogleSignIn } = useGoogleSignIn();

  return (
    <AuthLayout
      title={t('signupTitle')}
      subtitle={t('signupSubtitle')}
      isOffline={isOffline}
      offlineMessage={t('signupOfflineMessage')}
      showMosaic
    >
      <GoogleSignInButton
        label={t('continueWithGoogle')}
        onPress={handleGoogleSignIn}
        loading={isGoogleSubmitting}
        disabled={isOffline}
      />

      <AuthDivider label={t('or')} />

      <EmailSignupForm disabled={isOffline || isGoogleSubmitting} />

      <AuthFooterLink href="/(auth)/login" label={t('haveAccountLoginLink')} />
    </AuthLayout>
  );
}
