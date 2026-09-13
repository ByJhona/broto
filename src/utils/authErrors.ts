export function authErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;

  const message = error.message;

  if (message.includes('GOOGLE_SIGNIN_NOT_CONFIGURED')) {
    return 'Login com Google está indisponível no momento.';
  }
  if (message.includes('Invalid login credentials')) {
    return 'E-mail ou senha incorretos.';
  }
  if (message.includes('Email not confirmed')) {
    return 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.';
  }
  if (message.includes('User already registered')) {
    return 'Já existe uma conta com esse e-mail.';
  }
  if (message.includes('Password should be at least')) {
    return 'A senha deve ter no mínimo 6 caracteres.';
  }
  if (message.includes('Unable to validate email address') || message.includes('invalid format')) {
    return 'Digite um e-mail válido.';
  }
  if (message.includes('profiles_username_key')) {
    return 'Esse nome de usuário já está em uso.';
  }
  if (message.includes('Network request failed')) {
    return 'Sem conexão com a internet. Tente novamente.';
  }

  return message;
}
