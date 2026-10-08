import { useState, type FormEvent } from 'react';
import { supabase } from '../supabase';
import { errorMessage } from '../format';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const signInWithGoogle = async () => {
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (oauthError) setError(errorMessage('Não foi possível entrar com o Google.', oauthError));
  };

  const signInWithPassword = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setIsLoading(false);
    if (signInError) setError(errorMessage('E-mail ou senha incorretos.', signInError));
  };

  return (
    <main className="center-screen">
      <div className="card login-card stack">
        <div className="login-brand">
          <img src="/logo-mark.png" alt="" />
          <h1>Moderação do Bulbo</h1>
          <p className="muted small">Entre com a mesma conta que você usa no app.</p>
        </div>
        {error ? <p className="error">{error}</p> : null}
        <button type="button" className="button button-primary button-block" onClick={signInWithGoogle}>
          Entrar com Google
        </button>
        <div className="divider">ou</div>
        <form className="stack" onSubmit={signInWithPassword}>
          <label className="field" htmlFor="login-email">
            E-mail
            <input id="login-email" className="input" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="field" htmlFor="login-password">
            Senha
            <input
              id="login-password"
              className="input"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button type="submit" className="button button-outline button-block" disabled={isLoading}>
            Entrar com e-mail
          </button>
        </form>
      </div>
    </main>
  );
}
