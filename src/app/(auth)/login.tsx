import { useState } from 'react';
import { useRouter } from 'expo-router';
import { AuthDivider, AuthFooterLink, AuthLayout, FormError, FormField, GoogleSignInButton, SubmitButton } from '@/components';
import { useAuth, useNetworkStatus } from '@/hooks';
import { authErrorMessage } from '@/utils';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signInWithGoogle } = useAuth();
  const { isOffline } = useNetworkStatus();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const goToApp = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

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
      goToApp();
    } catch (err) {
      setError(authErrorMessage(err, 'Não foi possível entrar. Tente novamente.'));
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
      setError(authErrorMessage(err, 'Não foi possível continuar com o Google. Tente novamente.'));
    } finally {
      setIsGoogleSubmitting(false);
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

      <SubmitButton label="Entrar" onPress={handleSubmit} loading={isSubmitting} disabled={isOffline || isGoogleSubmitting} />

      <AuthDivider label="ou" />

      <GoogleSignInButton
        label="Continuar com Google"
        onPress={handleGoogleSignIn}
        loading={isGoogleSubmitting}
        disabled={isOffline || isSubmitting}
      />

      <AuthFooterLink href="/(auth)/signup" label="Não tem conta? Cadastre-se" />
    </AuthLayout>
  );
}
