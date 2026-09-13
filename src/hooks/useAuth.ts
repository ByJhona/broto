import { useCallback } from 'react';
import { signInWithEmail, signInWithGoogle, signOutUser, signUpWithEmail } from '@/services';
import { useAuthContext } from '@/store';

export function useAuth() {
  const { session, isLoading } = useAuthContext();

  const signIn = useCallback((email: string, password: string) => signInWithEmail(email, password), []);
  const signUp = useCallback(
    (name: string, username: string, email: string, password: string) => signUpWithEmail(name, username, email, password),
    []
  );
  const signInGoogle = useCallback(() => signInWithGoogle(), []);
  const signOut = useCallback(() => signOutUser(), []);

  return {
    session,
    user: session?.user ?? null,
    isLoading,
    signIn,
    signUp,
    signInWithGoogle: signInGoogle,
    signOut,
  };
}
