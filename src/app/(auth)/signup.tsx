import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import MailCheck from 'lucide-react-native/icons/mail-check';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { AuthFooterLink, AuthLayout, FormError, FormField, SubmitButton } from '@/components';
import { useAuth, useNetworkStatus } from '@/hooks';
import { isUsernameAvailable } from '@/services';
import { authErrorMessage, normalizeUsername, validateUsername } from '@/utils';

export default function SignupScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { signUp } = useAuth();
  const { isOffline } = useNetworkStatus();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const handleSubmit = async () => {
    setError(null);

    const trimmedName = name.trim();
    const normalizedUsername = normalizeUsername(username);
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError('Digite seu nome.');
      return;
    }
    const usernameError = validateUsername(username);
    if (usernameError) {
      setError(usernameError);
      return;
    }
    if (!trimmedEmail) {
      setError('Digite seu e-mail.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setIsSubmitting(true);
    try {
      const available = await isUsernameAvailable(normalizedUsername);
      if (!available) {
        setError('Esse nome de usuário já está em uso.');
        return;
      }

      const { session } = await signUp(trimmedName, normalizedUsername, trimmedEmail, password);
      if (!session) {
        setAwaitingConfirmation(true);
      } else if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    } catch (err) {
      setError(authErrorMessage(err, 'Não foi possível criar a conta. Tente novamente.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (awaitingConfirmation) {
    return (
      <View style={styles.confirmContainer}>
        <MailCheck size={Metrics.icon.xl} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
        <Text style={styles.confirmTitle}>Confirme seu e-mail</Text>
        <Text style={styles.confirmSubtitle}>
          Enviamos um link de confirmação para {email}. Abra-o para ativar sua conta e depois volte para entrar.
        </Text>
        <Link href="/(auth)/login" style={styles.confirmLink}>
          <Text style={styles.confirmLinkText}>Voltar para o login</Text>
        </Link>
      </View>
    );
  }

  return (
    <AuthLayout
      title="Crie sua conta"
      subtitle="Comece a cuidar do seu jardim hoje"
      isOffline={isOffline}
      offlineMessage="Sem conexão — criar conta exige internet."
    >
      <FormField label="Nome" value={name} onChangeText={setName} placeholder="Seu nome" autoComplete="name" />
      <FormField
        label="Nome de usuário"
        value={username}
        onChangeText={setUsername}
        placeholder="seunome"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
      />
      <Text style={styles.hint}>
        Só letras minúsculas, números e underline, começando com uma letra. De 3 a 20 caracteres, sem espaços.
      </Text>
      <FormField
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        placeholder="voce@email.com"
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <FormField
        label="Senha"
        value={password}
        onChangeText={setPassword}
        placeholder="Mínimo 6 caracteres"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="password-new"
      />

      <FormError>{error}</FormError>

      <SubmitButton label="Criar conta" onPress={handleSubmit} loading={isSubmitting} disabled={isOffline} />

      <AuthFooterLink href="/(auth)/login" label="Já tem conta? Entrar" />
    </AuthLayout>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  confirmContainer: {
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
