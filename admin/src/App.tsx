import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { Flag, History, LogOut, ShieldCheck, SquarePen, Users, type LucideIcon } from 'lucide-react';
import { getMyRole } from './api';
import { ErrorState, LoadingState } from './components';
import { ROLE_LABELS } from './format';
import { HistoryPage } from './pages/HistoryPage';
import { LoginPage } from './pages/LoginPage';
import { PublishPage } from './pages/PublishPage';
import { ReportsPage } from './pages/ReportsPage';
import { RolesPage } from './pages/RolesPage';
import { UsersPage } from './pages/UsersPage';
import { supabase } from './supabase';
import type { AppRole } from './types';

type Page = 'reports' | 'users' | 'history' | 'publish' | 'roles';

const NAV_ITEMS: { page: Page; label: string; icon: LucideIcon; adminOnly: boolean }[] = [
  { page: 'reports', label: 'Denúncias', icon: Flag, adminOnly: false },
  { page: 'users', label: 'Usuários', icon: Users, adminOnly: false },
  { page: 'history', label: 'Histórico', icon: History, adminOnly: false },
  { page: 'publish', label: 'Publicar', icon: SquarePen, adminOnly: true },
  { page: 'roles', label: 'Equipe', icon: ShieldCheck, adminOnly: true },
];

function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  return { session, isLoading };
}

function useSignOut() {
  const queryClient = useQueryClient();
  return async () => {
    await supabase.auth.signOut();
    queryClient.clear();
  };
}

function NoAccess() {
  const signOut = useSignOut();
  return (
    <main className="center-screen">
      <div className="card login-card stack">
        <div className="login-brand">
          <img src="/logo-mark.png" alt="" />
          <h1>Sem acesso</h1>
          <p className="muted small">Esta conta não faz parte da equipe de moderação. Peça a um admin para adicionar você.</p>
        </div>
        <button type="button" className="button button-outline button-block" onClick={signOut}>
          Sair
        </button>
      </div>
    </main>
  );
}

function CurrentPage({ page, userId }: Readonly<{ page: Page; userId: string }>) {
  if (page === 'users') return <UsersPage />;
  if (page === 'history') return <HistoryPage />;
  if (page === 'publish') return <PublishPage userId={userId} />;
  if (page === 'roles') return <RolesPage currentUserId={userId} />;
  return <ReportsPage />;
}

function Shell({ session, role }: Readonly<{ session: Session; role: AppRole }>) {
  const [page, setPage] = useState<Page>('reports');
  const signOut = useSignOut();
  const navItems = NAV_ITEMS.filter((item) => role === 'admin' || !item.adminOnly);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo-mark.png" alt="" />
          <div>
            <div className="brand-name">Bulbo</div>
            <div className="brand-tag">Moderação</div>
          </div>
        </div>
        <nav className="nav" aria-label="Seções">
          {navItems.map(({ page: itemPage, label, icon: Icon }) => (
            <button
              key={itemPage}
              type="button"
              className="nav-item"
              aria-current={page === itemPage ? 'page' : undefined}
              onClick={() => setPage(itemPage)}
            >
              <Icon size={16} strokeWidth={2} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="small">
            <div className="person-name">{session.user.email}</div>
            <div className="muted caption">{ROLE_LABELS[role]}</div>
          </div>
          <button type="button" className="nav-item" onClick={signOut}>
            <LogOut size={16} strokeWidth={2} />
            Sair
          </button>
        </div>
      </aside>
      <main className="main">
        <CurrentPage page={page} userId={session.user.id} />
      </main>
    </div>
  );
}

function RoleGate({ session }: Readonly<{ session: Session }>) {
  const role = useQuery({ queryKey: ['my-role', session.user.id], queryFn: getMyRole });

  if (role.isPending) return <main className="center-screen"><LoadingState /></main>;
  if (role.isError) return <main className="center-screen"><ErrorState message="Não foi possível verificar seu acesso." /></main>;
  if (!role.data) return <NoAccess />;
  return <Shell session={session} role={role.data} />;
}

export function App() {
  const { session, isLoading } = useSession();

  if (isLoading) return <main className="center-screen"><LoadingState /></main>;
  if (!session) return <LoginPage />;
  return <RoleGate session={session} />;
}
