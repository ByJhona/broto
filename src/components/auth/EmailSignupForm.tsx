import { useState } from 'react';
import { useTranslation } from '@/i18n';
import { useAuth } from '@/hooks';
import { authErrorMessage, hasFieldErrors, validateSignup, type AuthFieldErrors } from '@/utils';
import { FormError } from '../FormError';
import { FormField } from '../FormField';
import { SubmitButton } from '../SubmitButton';
import { useGoToApp } from './useGoToApp';

type EmailSignupFormProps = {
  disabled: boolean;
};

export function EmailSignupForm({ disabled }: Readonly<EmailSignupFormProps>) {
  const { t } = useTranslation('auth');
  const { signUp } = useAuth();
  const goToApp = useGoToApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    const errors = validateSignup({ name, email, password }, t);
    setFieldErrors(errors);
    if (hasFieldErrors(errors)) return;

    setIsSubmitting(true);
    try {
      const { session } = await signUp(name.trim(), email.trim(), password);
      if (session) goToApp();
      else setError(t('signupError'));
    } catch (err) {
      setError(authErrorMessage(err, t('signupError')));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <FormField
        label={t('nameLabel')}
        value={name}
        onChangeText={setName}
        placeholder={t('namePlaceholder')}
        autoComplete="name"
        error={fieldErrors.name}
      />
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
      <FormField
        label={t('passwordLabel')}
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

      <SubmitButton label={t('signupCta')} onPress={handleSubmit} loading={isSubmitting} disabled={disabled} />
    </>
  );
}
