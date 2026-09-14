import { i18n } from '@/i18n';

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 20;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateUsername(raw: string): string | null {
  const username = normalizeUsername(raw);

  if (!username) {
    return i18n.t('validation:usernameRequired');
  }
  if (/\s/.test(username)) {
    return i18n.t('validation:usernameNoSpaces');
  }
  if (!/^[a-z0-9_]+$/.test(username)) {
    return i18n.t('validation:usernameInvalidChars');
  }
  if (!/^[a-z]/.test(username)) {
    return i18n.t('validation:usernameMustStartWithLetter');
  }
  if (username.length < USERNAME_MIN_LENGTH) {
    return i18n.t('validation:usernameTooShort', { min: USERNAME_MIN_LENGTH });
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return i18n.t('validation:usernameTooLong', { max: USERNAME_MAX_LENGTH });
  }

  return null;
}
