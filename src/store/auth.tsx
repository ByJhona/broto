import { createContext, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { configurePurchases, supabase } from '@/services';

type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextValue>({ session: null, isLoading: true });

function hasExpired(expiresAt: number | null): boolean {
  return expiresAt !== null && expiresAt * 1000 <= Date.now();
}

export function AuthProvider({ children }: Readonly<PropsWithChildren>) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const expiresAtRef = useRef<number | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      expiresAtRef.current = data.session?.expires_at ?? null;
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      const refreshedAfterExpiry = event === 'TOKEN_REFRESHED' && hasExpired(expiresAtRef.current);
      expiresAtRef.current = newSession?.expires_at ?? null;

      // Token refreshes fire a new session object with the same user; skip the
      // state update so it doesn't re-render every useAuth() consumer in the app.
      setSession((current) => (current?.user.id === newSession?.user.id ? current : newSession));

      if (refreshedAfterExpiry) {
        queryClient.invalidateQueries();
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [queryClient]);

  useEffect(() => {
    configurePurchases(session?.user.id ?? null);
  }, [session?.user.id]);

  const value = useMemo(() => ({ session, isLoading }), [session, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  return useContext(AuthContext);
}
