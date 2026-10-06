import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Link } from 'expo-router';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { useAuth } from '@/hooks';
import { authErrorMessage, hasFieldErrors, validateLogin, type AuthFieldErrors } from '@/utils';
import { FormError } from '../FormError';
import { FormField } from '../FormField';
import { Button } from '../Button';
import { useGoToApp } from './useGoToApp';

type EmailLoginFormProps = {
  disabled: boolean;
};

export function EmailLoginForm({ disabled }: Readonly<EmailLoginFormProps>) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('auth');
  const { signIn } = useAuth();
  const goToApp = useGoToApp();
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
        error={fieldErrors.password}
      />
      <Link href="/(auth)/forgot-password" style={styles.forgotLink}>
        <Text style={styles.forgotLinkText}>{t('forgotPasswordLink')}</Text>
      </Link>

      <FormError>{error}</FormError>

      <Button label={t('loginCta')} onPress={handleSubmit} loading={isSubmitting} disabled={disabled} />
    </>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    forgotLink: {
      alignSelf: 'flex-end',
      marginTop: -Metrics.spacing.xs,
      marginBottom: Metrics.spacing.md,
    },
    forgotLinkText: {
      ...Typography.label,
      color: colors.primary,
    },
  });
