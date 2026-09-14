import { i18n } from '@/i18n';

export function authErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;

  const message = error.message;

  if (message.includes('GOOGLE_SIGNIN_NOT_CONFIGURED')) {
    return i18n.t('errors:googleSignInUnavailable');
  }
  if (message.includes('Invalid login credentials')) {
    return i18n.t('errors:invalidCredentials');
  }
  if (message.includes('Email not confirmed')) {
    return i18n.t('errors:emailNotConfirmed');
  }
  if (message.includes('User already registered')) {
    return i18n.t('errors:userAlreadyRegistered');
  }
  if (message.includes('Password should be at least')) {
    return i18n.t('errors:passwordTooShort');
  }
  if (message.includes('Unable to validate email address') || message.includes('invalid format')) {
    return i18n.t('errors:invalidEmail');
  }
  if (message.includes('profiles_username_key')) {
    return i18n.t('errors:usernameTaken');
  }
  if (message.includes('Network request failed')) {
    return i18n.t('errors:networkError');
  }

  return message;
}
