import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { getProfiles, getUserRoles, searchProfiles } from '../api';
import { EmptyState, ErrorState, LoadingState, PageHeader, Person } from '../components';
import { ROLE_LABELS } from '../format';
import { useSetUserRole } from '../mutations';
import type { AppRole, UserRole } from '../types';

const MIN_SEARCH_LENGTH = 2;

async function getTeam() {
  const roles = await getUserRoles();
  return { roles, profiles: await getProfiles(roles.map((role) => role.user_id)) };
}

function TeamList({ currentUserId }: Readonly<{ currentUserId: string }>) {
  const team = useQuery({ queryKey: ['roles'], queryFn: getTeam });
  const setRole = useSetUserRole();

  if (team.isPending) return <LoadingState />;
  if (team.isError) return <ErrorState message="Não foi possível carregar a equipe." />;

  const renderMember = (member: UserRole) => (
    <div key={member.user_id} className="card">
      <div className="row spread">
        <div className="grow">
          <Person profile={team.data.profiles.get(member.user_id) ?? null} />
        </div>
        <span className={member.role === 'admin' ? 'pill pill-primary' : 'pill pill-leaf'}>{ROLE_LABELS[member.role]}</span>
        {member.user_id === currentUserId ? null : (
          <button
            type="button"
            className="button button-ghost-danger"
            disabled={setRole.isPending}
            onClick={() => setRole.mutate({ userId: member.user_id, role: null })}
          >
            Remover papel
          </button>
        )}
      </div>
    </div>
  );

  return <div className="list">{team.data.roles.map(renderMember)}</div>;
}

function AddMember() {
  const [input, setInput] = useState('');
  const [term, setTerm] = useState('');
  const results = useQuery({ queryKey: ['profiles', term], queryFn: () => searchProfiles(term), enabled: term.length >= MIN_SEARCH_LENGTH });
  const setRole = useSetUserRole();

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setTerm(input.trim());
  };

  const grant = (userId: string, role: AppRole) => setRole.mutate({ userId, role }, { onSuccess: () => setTerm('') });

  return (
    <div className="stack">
      <h2>Adicionar à equipe</h2>
      <form className="row" onSubmit={handleSearch}>
        <input
          id="role-search"
          className="input grow"
          type="search"
          placeholder="Nome ou nome de usuário"
          aria-label="Buscar usuário para a equipe"
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <button type="submit" className="button button-primary">
          Buscar
        </button>
      </form>
      {results.isError ? <ErrorState message="Não foi possível buscar usuários." /> : null}
      {results.data?.length === 0 ? <EmptyState icon={Search} title="Ninguém encontrado" message="Tente outro nome ou nome de usuário." /> : null}
      {results.data?.map((profile) => (
        <div key={profile.id} className="card">
          <div className="row spread">
            <div className="grow">
              <Person profile={profile} />
            </div>
            <button type="button" className="button button-outline" disabled={setRole.isPending} onClick={() => grant(profile.id, 'moderator')}>
              Tornar moderador
            </button>
            <button type="button" className="button button-outline" disabled={setRole.isPending} onClick={() => grant(profile.id, 'admin')}>
              Tornar admin
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RolesPage({ currentUserId }: Readonly<{ currentUserId: string }>) {
  return (
    <div className="content">
      <PageHeader title="Equipe" subtitle="Quem pode moderar o Muda Vai Vem. Moderadores cuidam das denúncias e suspensões; admins também gerenciam a equipe." />
      <TeamList currentUserId={currentUserId} />
      <AddMember />
    </div>
  );
}
