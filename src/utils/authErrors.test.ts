import { i18n } from '@/i18n';
import { authErrorMessage } from './authErrors';

const FALLBACK = 'algo deu errado';

describe('authErrorMessage', () => {
  it('returns the fallback for a non-Error value', () => {
    expect(authErrorMessage('just a string', FALLBACK)).toBe(FALLBACK);
    expect(authErrorMessage(undefined, FALLBACK)).toBe(FALLBACK);
  });

  it('returns the fallback for an error it does not recognize', () => {
    expect(authErrorMessage(new Error('some unmapped backend error'), FALLBACK)).toBe(FALLBACK);
  });

  it.each([
    ['GOOGLE_SIGNIN_NOT_CONFIGURED', 'errors:googleSignInUnavailable'],
    ['Invalid login credentials', 'errors:invalidCredentials'],
    ['Email not confirmed', 'errors:emailNotConfirmed'],
    ['User already registered', 'errors:userAlreadyRegistered'],
    ['Password should be at least 6 characters', 'errors:passwordTooShort'],
    ['Unable to validate email address', 'errors:invalidEmail'],
    ['invalid format for field email', 'errors:invalidEmail'],
    ['duplicate key value violates unique constraint "profiles_username_key"', 'errors:usernameTaken'],
    ['Network request failed', 'errors:networkError'],
  ])('maps a raw error containing %p to the user-facing message for %p', (rawMessage, translationKey) => {
    expect(authErrorMessage(new Error(rawMessage), FALLBACK)).toBe(i18n.t(translationKey));
  });

  it('never leaks the raw error message to the user', () => {
    const rawMessage = 'insufficient_privilege: permission denied for table subscriptions';
    const result = authErrorMessage(new Error(rawMessage), FALLBACK);
    expect(result).not.toContain(rawMessage);
  });
});
