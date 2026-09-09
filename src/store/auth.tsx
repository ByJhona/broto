import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import type { Session } from '@supabase/supabase-js';
import { configurePurchases, supabase } from '@/services';

type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextValue>({ session: null, isLoading: true });

export function AuthProvider({ children }: Readonly<PropsWithChildren>) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // Token refreshes fire a new session object with the same user; skip the
      // state update so it doesn't re-render every useAuth() consumer in the app.
      setSession((current) => (current?.user.id === newSession?.user.id ? current : newSession));
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    configurePurchases(session?.user.id ?? null);
  }, [session?.user.id]);

  const value = useMemo(() => ({ session, isLoading }), [session, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  return useContext(AuthContext);
}
