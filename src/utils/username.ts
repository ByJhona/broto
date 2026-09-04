const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 20;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateUsername(raw: string): string | null {
  const username = normalizeUsername(raw);

  if (!username) {
    return 'Digite um nome de usuário.';
  }
  if (/\s/.test(username)) {
    return 'Nome de usuário não pode ter espaços.';
  }
  if (!/^[a-z0-9_]+$/.test(username)) {
    return 'Nome de usuário só pode ter letras, números e underline (_).';
  }
  if (!/^[a-z]/.test(username)) {
    return 'Nome de usuário deve começar com uma letra.';
  }
  if (username.length < USERNAME_MIN_LENGTH) {
    return `Nome de usuário deve ter no mínimo ${USERNAME_MIN_LENGTH} caracteres.`;
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return `Nome de usuário deve ter no máximo ${USERNAME_MAX_LENGTH} caracteres.`;
  }

  return null;
}
