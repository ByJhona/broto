import { useState } from 'react';
import { useRouter } from 'expo-router';
import { AuthDivider, AuthFooterLink, AuthLayout, FormError, FormField, GoogleSignInButton, SubmitButton } from '@/components';
import { useTranslation } from '@/i18n';
import { useAuth, useNetworkStatus } from '@/hooks';
import { authErrorMessage, Toast } from '@/utils';

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation('auth');
  const { signIn, signInWithGoogle } = useAuth();
  const { isOffline } = useNetworkStatus();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const goToApp = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleSubmit = async () => {
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError(t('fillEmailAndPassword'));
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn(trimmedEmail, password);
      goToApp();
    } catch (err) {
      setError(authErrorMessage(err, t('signInError')));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleSubmitting(true);
    try {
      const result = await signInWithGoogle();
      if (result) goToApp();
    } catch (err) {
      Toast.error(authErrorMessage(err, t('googleSignInError')));
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title={t('loginTitle')}
      subtitle={t('loginSubtitle')}
      isOffline={isOffline}
      offlineMessage={t('loginOfflineMessage')}
    >
      <FormField
        label={t('emailLabel')}
        value={email}
        onChangeText={setEmail}
        placeholder={t('emailPlaceholder')}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <FormField
        label={t('passwordLabel')}
        value={password}
        onChangeText={setPassword}
        placeholder={t('passwordPlaceholder')}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="password"
      />

      <FormError>{error}</FormError>

      <SubmitButton label={t('loginCta')} onPress={handleSubmit} loading={isSubmitting} disabled={isOffline || isGoogleSubmitting} />

      <AuthDivider label={t('or')} />

      <GoogleSignInButton
        label={t('continueWithGoogle')}
        onPress={handleGoogleSignIn}
        loading={isGoogleSubmitting}
        disabled={isOffline || isSubmitting}
      />

      <AuthFooterLink href="/(auth)/signup" label={t('noAccountSignupLink')} />
    </AuthLayout>
  );
}
