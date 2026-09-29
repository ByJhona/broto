export const MIN_PASSWORD_LENGTH = 6;

type Translate = (key: string) => string;

export type AuthField = 'name' | 'email' | 'password';
export type AuthFieldErrors = Partial<Record<AuthField, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

function emailError(email: string, t: Translate): string | undefined {
  if (!email.trim()) return t('auth:emailRequired');
  return EMAIL_PATTERN.test(email.trim()) ? undefined : t('auth:emailInvalid');
}

function newPasswordError(password: string, t: Translate): string | undefined {
  return password.length < MIN_PASSWORD_LENGTH ? t('auth:passwordMinLength') : undefined;
}

function withoutEmpty(errors: AuthFieldErrors): AuthFieldErrors {
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => !!message));
}

export function validateLogin(values: { email: string; password: string }, t: Translate): AuthFieldErrors {
  return withoutEmpty({
    email: emailError(values.email, t),
    password: values.password ? undefined : t('auth:passwordRequired'),
  });
}

export function validateSignup(values: { name: string; email: string; password: string }, t: Translate): AuthFieldErrors {
  return withoutEmpty({
    name: values.name.trim() ? undefined : t('auth:nameRequired'),
    email: emailError(values.email, t),
    password: newPasswordError(values.password, t),
  });
}

export function validateEmailOnly(email: string, t: Translate): AuthFieldErrors {
  return withoutEmpty({ email: emailError(email, t) });
}

export function validateNewPassword(password: string, t: Translate): AuthFieldErrors {
  return withoutEmpty({ password: newPasswordError(password, t) });
}

export function hasFieldErrors(errors: AuthFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
