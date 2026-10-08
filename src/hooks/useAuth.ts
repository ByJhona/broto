import { useCallback } from 'react';
import { deleteAccount, signInWithEmail, signInWithGoogle, signOutUser, signUpWithEmail } from '@/services';
import { useAuthContext } from '@/store';

export function useAuth() {
  const { session, isLoading } = useAuthContext();

  const signIn = useCallback((email: string, password: string) => signInWithEmail(email, password), []);
  const signUp = useCallback(
    (name: string, email: string, password: string) => signUpWithEmail(name, email, password),
    []
  );
  const signInGoogle = useCallback(() => signInWithGoogle(), []);
  const signOut = useCallback(() => signOutUser(), []);
  const deleteUserAccount = useCallback(() => deleteAccount(), []);

  return {
    session,
    user: session?.user ?? null,
    isLoading,
    signIn,
    signUp,
    signInWithGoogle: signInGoogle,
    signOut,
    deleteAccount: deleteUserAccount,
  };
}
