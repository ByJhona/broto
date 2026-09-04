import { useState } from 'react';
import { useRouter } from 'expo-router';
import { AuthFooterLink, AuthLayout, FormError, FormField, SubmitButton } from '@/components';
import { useAuth, useNetworkStatus } from '@/hooks';
import { authErrorMessage } from '@/utils';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { isOffline } = useNetworkStatus();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Preencha seu e-mail e senha.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn(trimmedEmail, password);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    } catch (err) {
      setError(authErrorMessage(err, 'Não foi possível entrar. Tente novamente.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Bem-vindo de volta"
      subtitle="Entre para continuar cuidando das suas plantas"
      isOffline={isOffline}
      offlineMessage="Sem conexão — entrar exige internet."
    >
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
        placeholder="Sua senha"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="password"
      />

      <FormError>{error}</FormError>

      <SubmitButton label="Entrar" onPress={handleSubmit} loading={isSubmitting} disabled={isOffline} />

      <AuthFooterLink href="/(auth)/signup" label="Não tem conta? Cadastre-se" />
    </AuthLayout>
  );
}
