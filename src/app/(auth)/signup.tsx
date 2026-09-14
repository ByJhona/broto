import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import MailCheck from 'lucide-react-native/icons/mail-check';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { AuthDivider, AuthFooterLink, AuthLayout, FormError, FormField, GoogleSignInButton, SubmitButton } from '@/components';
import { useTranslation } from '@/i18n';
import { useAuth, useNetworkStatus } from '@/hooks';
import { isUsernameAvailable } from '@/services';
import { authErrorMessage, normalizeUsername, validateUsername } from '@/utils';

export default function SignupScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation('auth');
  const { signUp, signInWithGoogle } = useAuth();
  const { isOffline } = useNetworkStatus();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const goToApp = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleSubmit = async () => {
    setError(null);

    const trimmedName = name.trim();
    const normalizedUsername = normalizeUsername(username);
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError(t('nameRequired'));
      return;
    }
    const usernameError = validateUsername(username);
    if (usernameError) {
      setError(usernameError);
      return;
    }
    if (!trimmedEmail) {
      setError(t('emailRequired'));
      return;
    }
    if (password.length < 6) {
      setError(t('passwordMinLength'));
      return;
    }

    setIsSubmitting(true);
    try {
      const available = await isUsernameAvailable(normalizedUsername);
      if (!available) {
        setError(t('usernameTaken'));
        return;
      }

      const { session } = await signUp(trimmedName, normalizedUsername, trimmedEmail, password);
      if (!session) {
        setAwaitingConfirmation(true);
      } else {
        goToApp();
      }
    } catch (err) {
      setError(authErrorMessage(err, t('signupError')));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsGoogleSubmitting(true);
    try {
      const result = await signInWithGoogle();
      if (result) goToApp();
    } catch (err) {
      setError(authErrorMessage(err, t('googleSignInError')));
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  if (awaitingConfirmation) {
    return (
      <View style={styles.confirmContainer}>
        <MailCheck size={Metrics.icon.xl} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
        <Text style={styles.confirmTitle}>{t('confirmEmailTitle')}</Text>
        <Text style={styles.confirmSubtitle}>
          {t('confirmEmailMessage', { email })}
        </Text>
        <Link href="/(auth)/login" style={styles.confirmLink}>
          <Text style={styles.confirmLinkText}>{t('backToLogin')}</Text>
        </Link>
      </View>
    );
  }

  return (
    <AuthLayout
      title={t('signupTitle')}
      subtitle={t('signupSubtitle')}
      isOffline={isOffline}
      offlineMessage={t('signupOfflineMessage')}
    >
      <FormField label={t('nameLabel')} value={name} onChangeText={setName} placeholder={t('namePlaceholder')} autoComplete="name" />
      <FormField
        label={t('usernameLabel')}
        value={username}
        onChangeText={setUsername}
        placeholder={t('usernamePlaceholder')}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
      />
      <Text style={styles.hint}>
        {t('usernameHint')}
      </Text>
      <FormField
        label={t('emailLabel')}
        value={email}
        onChangeText={setEmail}
        placeholder={t('emailPlaceholder')}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
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
      />

      <FormError>{error}</FormError>

      <SubmitButton label={t('signupCta')} onPress={handleSubmit} loading={isSubmitting} disabled={isOffline || isGoogleSubmitting} />

      <AuthDivider label={t('or')} />

      <GoogleSignInButton
        label={t('continueWithGoogle')}
        onPress={handleGoogleSignIn}
        loading={isGoogleSubmitting}
        disabled={isOffline || isSubmitting}
      />

      <AuthFooterLink href="/(auth)/login" label={t('haveAccountLoginLink')} />
    </AuthLayout>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  confirmContainer: {
    ...Metrics.layout.centeredContent,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Metrics.spacing.xl,
    backgroundColor: colors.background,
  },
  confirmTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.foreground,
    textAlign: 'center',
    marginTop: Metrics.spacing.md,
  },
  confirmSubtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: Metrics.spacing.xs,
    marginBottom: Metrics.spacing.xl,
  },
  confirmLink: {
    marginTop: Metrics.spacing.lg,
    alignSelf: 'center',
  },
  confirmLinkText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  hint: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: -Metrics.spacing.sm,
    marginBottom: Metrics.spacing.md,
  },
  });
