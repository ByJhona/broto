import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, UserCheck } from 'lucide-react';
import { getProfiles, getSuspensions, searchProfiles } from '../api';
import { EmptyState, ErrorState, LoadingState, PageHeader, Person } from '../components';
import { SuspendDialog } from '../dialogs';
import { formatSuspension } from '../format';
import { useSuspendUser, useUnsuspendUser } from '../mutations';
import type { Profile } from '../types';

const MIN_SEARCH_LENGTH = 2;

type UserRowProps = {
  profile: Profile;
  bannedUntil: string | undefined;
  onSuspend: (profile: Profile) => void;
};

function UserRow({ profile, bannedUntil, onSuspend }: Readonly<UserRowProps>) {
  const unsuspend = useUnsuspendUser();

  return (
    <div className="card">
      <div className="row spread">
        <div className="grow">
          <Person profile={profile} />
        </div>
        {bannedUntil ? <span className="pill pill-danger">{formatSuspension(bannedUntil)}</span> : null}
        {bannedUntil ? (
          <button type="button" className="button button-outline" disabled={unsuspend.isPending} onClick={() => unsuspend.mutate(profile.id)}>
            Reativar
          </button>
        ) : (
          <button type="button" className="button button-ghost-danger" onClick={() => onSuspend(profile)}>
            Suspender
          </button>
        )}
      </div>
    </div>
  );
}

async function getSuspendedProfiles() {
  const suspensions = await getSuspensions();
  const profiles = await getProfiles([...suspensions.keys()]);
  return { suspensions, profiles: [...profiles.values()] };
}

function UserList({ term, onSuspend }: Readonly<{ term: string; onSuspend: (profile: Profile) => void }>) {
  const isSearching = term.length >= MIN_SEARCH_LENGTH;
  const suspended = useQuery({ queryKey: ['suspensions'], queryFn: getSuspendedProfiles });
  const results = useQuery({ queryKey: ['profiles', term], queryFn: () => searchProfiles(term), enabled: isSearching });
  const query = isSearching ? results : suspended;

  if (query.isPending || suspended.isPending) return <LoadingState />;
  if (query.isError || suspended.isError) return <ErrorState message="Não foi possível carregar os usuários." />;

  const profiles = isSearching ? (results.data ?? []) : suspended.data.profiles;
  if (profiles.length === 0) {
    return isSearching ? (
      <EmptyState icon={Search} title="Ninguém encontrado" message="Tente outro nome ou nome de usuário." />
    ) : (
      <EmptyState icon={UserCheck} title="Nenhum usuário suspenso" message="Busque alguém pelo nome ou nome de usuário para suspender." />
    );
  }

  return (
    <div className="list">
      {!isSearching ? <h2>Suspensos agora</h2> : null}
      {profiles.map((profile) => (
        <UserRow key={profile.id} profile={profile} bannedUntil={suspended.data.suspensions.get(profile.id)} onSuspend={onSuspend} />
      ))}
    </div>
  );
}

export function UsersPage() {
  const [input, setInput] = useState('');
  const [term, setTerm] = useState('');
  const [suspendTarget, setSuspendTarget] = useState<Profile | null>(null);
  const suspend = useSuspendUser();

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setTerm(input.trim());
  };

  const handleSuspend = (days: number | null, reason: string | null) => {
    if (!suspendTarget) return;
    suspend.mutate({ userId: suspendTarget.id, days, reason }, { onSuccess: () => setSuspendTarget(null) });
  };

  return (
    <div className="content">
      <PageHeader title="Usuários" subtitle="Busque pessoas da comunidade para suspender ou reativar." />
      <form className="row" onSubmit={handleSearch}>
        <input
          id="user-search"
          className="input grow"
          type="search"
          placeholder="Nome ou nome de usuário"
          aria-label="Buscar usuário"
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <button type="submit" className="button button-primary">
          Buscar
        </button>
      </form>
      <UserList term={term} onSuspend={setSuspendTarget} />
      {suspendTarget ? (
        <SuspendDialog profile={suspendTarget} isPending={suspend.isPending} onClose={() => setSuspendTarget(null)} onConfirm={handleSuspend} />
      ) : null}
    </div>
  );
}
