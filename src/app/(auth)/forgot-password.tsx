import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/i18n';
import { AuthLayout, FormError, FormField, SubmitButton } from '@/components';
import { useNetworkStatus } from '@/hooks';
import { requestPasswordReset } from '@/services';
import { authErrorMessage, hasFieldErrors, validateEmailOnly, type AuthFieldErrors } from '@/utils';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation('auth');
  const { isOffline } = useNetworkStatus();
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    const errors = validateEmailOnly(email, t);
    setFieldErrors(errors);
    if (hasFieldErrors(errors)) return;

    const trimmedEmail = email.trim();
    setIsSubmitting(true);
    try {
      await requestPasswordReset(trimmedEmail);
      setSentTo(trimmedEmail);
    } catch (err) {
      setError(authErrorMessage(err, t('resetRequestError')));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sentTo) {
    return (
      <AuthLayout
        title={t('resetLinkSentTitle')}
        subtitle={t('resetLinkSentMessage', { email: sentTo })}
        isOffline={isOffline}
        offlineMessage={t('loginOfflineMessage')}
      >
        <SubmitButton label={t('backToLogin')} onPress={() => router.replace('/(auth)/login')} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t('forgotPasswordTitle')}
      subtitle={t('forgotPasswordMessage')}
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
        error={fieldErrors.email}
      />
      <FormError>{error}</FormError>
      <SubmitButton label={t('sendResetLinkCta')} onPress={handleSubmit} loading={isSubmitting} disabled={isOffline} />
    </AuthLayout>
  );
}
