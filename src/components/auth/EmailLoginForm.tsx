import { useRef, useState } from 'react';
import { StyleSheet, type TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Metrics } from '@/theme';
import { useTranslation } from '@/i18n';
import { useAuth } from '@/hooks';
import { authErrorMessage, hasFieldErrors, validateLogin, type AuthFieldErrors } from '@/utils';
import { FormError } from '../FormError';
import { FormField } from '../FormField';
import { Button } from '../Button';
import { TextButton } from '../TextButton';
import { useGoToApp } from './useGoToApp';

type EmailLoginFormProps = {
  disabled: boolean;
};

export function EmailLoginForm({ disabled }: Readonly<EmailLoginFormProps>) {
  const router = useRouter();
  const { t } = useTranslation('auth');
  const { signIn } = useAuth();
  const goToApp = useGoToApp();
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    const errors = validateLogin({ email, password }, t);
    setFieldErrors(errors);
    if (hasFieldErrors(errors)) return;

    setIsSubmitting(true);
    try {
      await signIn(email.trim(), password);
      goToApp();
    } catch (err) {
      setError(authErrorMessage(err, t('signInError')));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <FormField
        label={t('emailLabel')}
        value={email}
        onChangeText={setEmail}
        placeholder={t('emailPlaceholder')}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        autoFocus
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
        error={fieldErrors.email}
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
        ref={passwordRef}
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
        error={fieldErrors.password}
      />
      <TextButton
        label={t('forgotPasswordLink')}
        tone="primary"
        accessibilityRole="link"
        onPress={() => router.push('/(auth)/forgot-password')}
        style={styles.forgotLink}
      />

      <FormError>{error}</FormError>

      <Button label={t('loginCta')} onPress={handleSubmit} loading={isSubmitting} disabled={disabled} />
    </>
  );
}

const styles = StyleSheet.create({
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: Metrics.spacing.sm,
  },
});
