import { useState } from 'react';
import { useTranslation } from '@/i18n';
import { useAuth } from '@/hooks';
import { authErrorMessage, Toast } from '@/utils';
import { useGoToApp } from './useGoToApp';

export function useGoogleSignIn() {
  const { t } = useTranslation('auth');
  const { signInWithGoogle } = useAuth();
  const goToApp = useGoToApp();
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

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

  return { isGoogleSubmitting, handleGoogleSignIn };
}
