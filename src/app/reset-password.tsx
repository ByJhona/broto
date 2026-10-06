import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from '@/i18n';
import { AuthLayout, Button, FormError, FormField, LoadingScreen } from '@/components';
import { useNetworkStatus } from '@/hooks';
import { exchangeRecoveryCode, updatePassword } from '@/services';
import { authErrorMessage, hasFieldErrors, Toast, validateNewPassword, type AuthFieldErrors } from '@/utils';

type RecoveryStage = 'verifying' | 'ready' | 'invalid';

function useRecoverySession(code: string | undefined): RecoveryStage {
  const [stage, setStage] = useState<RecoveryStage>(code ? 'verifying' : 'invalid');

  useEffect(() => {
    if (!code) return;
    exchangeRecoveryCode(code)
      .then(() => setStage('ready'))
      .catch(() => setStage('invalid'));
  }, [code]);

  return stage;
}

function InvalidLink({ isOffline }: Readonly<{ isOffline: boolean }>) {
  const router = useRouter();
  const { t } = useTranslation('auth');
  return (
    <AuthLayout
      title={t('resetLinkInvalidTitle')}
      subtitle={t('resetLinkInvalidMessage')}
      isOffline={isOffline}
      offlineMessage={t('loginOfflineMessage')}
    >
      <Button label={t('requestNewLinkCta')} onPress={() => router.replace('/(auth)/forgot-password')} />
    </AuthLayout>
  );
}

function NewPasswordForm({ isOffline }: Readonly<{ isOffline: boolean }>) {
  const router = useRouter();
  const { t } = useTranslation('auth');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    const errors = validateNewPassword(password, t);
    setFieldErrors(errors);
    if (hasFieldErrors(errors)) return;

    setIsSubmitting(true);
    try {
      await updatePassword(password);
      Toast.success(t('passwordUpdated'));
      router.replace('/(tabs)');
    } catch (err) {
      setError(authErrorMessage(err, t('passwordUpdateError')));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title={t('newPasswordTitle')}
      subtitle={t('newPasswordMessage')}
      isOffline={isOffline}
      offlineMessage={t('loginOfflineMessage')}
    >
      <FormField
        label={t('newPasswordLabel')}
        value={password}
        onChangeText={setPassword}
        placeholder={t('passwordMinPlaceholder')}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="password-new"
        error={fieldErrors.password}
      />
      <FormError>{error}</FormError>
      <Button label={t('saveNewPasswordCta')} onPress={handleSubmit} loading={isSubmitting} disabled={isOffline} />
    </AuthLayout>
  );
}

export default function ResetPasswordScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { isOffline } = useNetworkStatus();
  const stage = useRecoverySession(code);

  if (stage === 'verifying') return <LoadingScreen />;
  if (stage === 'invalid') return <InvalidLink isOffline={isOffline} />;
  return <NewPasswordForm isOffline={isOffline} />;
}
