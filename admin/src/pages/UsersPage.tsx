import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Search, UserCheck } from 'lucide-react';
import { getActivePenalties, getPenalties, getProfiles, searchProfiles } from '../api';
import { EmptyState, ErrorState, LoadingState, PageHeader, Person } from '../components';
import { PenaltyDialog, type PenaltyChoice } from '../dialogs';
import { formatDate, formatDateTime, PENALTY_LABELS, penaltyStatus } from '../format';
import { isActivePenalty, suggestPenalty } from '../moderation';
import { useApplyPenalty, useRevokePenalty } from '../mutations';
import { StandingPills } from '../views';
import type { Penalty, Profile } from '../types';

const MIN_SEARCH_LENGTH = 2;

function penaltyPeriod(penalty: Penalty): string {
  if (penalty.kind === 'warning') return formatDateTime(penalty.created_at);
  if (penalty.ends_at === null) return `Desde ${formatDate(penalty.created_at)}, sem prazo`;
  return `${formatDate(penalty.created_at)} até ${formatDate(penalty.ends_at)}`;
}

function PenaltyRow({ penalty, moderators }: Readonly<{ penalty: Penalty; moderators: Map<string, Profile> }>) {
  const revoke = useRevokePenalty();
  const moderator = penalty.created_by ? moderators.get(penalty.created_by) : undefined;
  const active = isActivePenalty(penalty);

  return (
    <div className="history-item">
      <div className="grow">
        <div className="row">
          <strong className="small">{PENALTY_LABELS[penalty.kind]}</strong>
          {active ? <span className="pill pill-danger">Ativa</span> : null}
          {penalty.revoked_at ? <span className="pill">Removida</span> : null}
        </div>
        <p className="small muted">{penaltyPeriod(penalty)}</p>
        {penalty.reason ? <p className="small">Motivo: {penalty.reason}</p> : null}
        <p className="caption muted">Aplicada por {moderator ? `@${moderator.username}` : 'sistema'}</p>
      </div>
      {active ? (
        <button type="button" className="button button-outline" disabled={revoke.isPending} onClick={() => revoke.mutate(penalty)}>
          Remover penalidade
        </button>
      ) : null}
    </div>
  );
}

async function getUserHistory(userId: string) {
  const penalties = await getPenalties([userId]);
  const moderatorIds = penalties.map((penalty) => penalty.created_by).filter((id): id is string => id !== null);
  return { penalties, moderators: await getProfiles(moderatorIds) };
}

function UserDetail({ profile, onBack }: Readonly<{ profile: Profile; onBack: () => void }>) {
  const history = useQuery({ queryKey: ['penalties', 'user', profile.id], queryFn: () => getUserHistory(profile.id) });
  const penalize = useApplyPenalty();
  const [isPenalizing, setIsPenalizing] = useState(false);
  const penalties = history.data?.penalties ?? [];

  const handlePenalty = (choice: PenaltyChoice) =>
    penalize.mutate(
      { userId: profile.id, kind: choice.kind, days: choice.days, reason: choice.reason, reportIds: [], hide: null },
      { onSuccess: () => setIsPenalizing(false) }
    );

  return (
    <div className="stack">
      <button type="button" className="button button-outline self-start" onClick={onBack}>
        <ArrowLeft size={16} strokeWidth={2} />
        Voltar
      </button>
      <div className="card">
        <div className="row spread">
          <div className="grow">
            <Person profile={profile} />
          </div>
          <button type="button" className="button button-danger" onClick={() => setIsPenalizing(true)}>
            Aplicar penalidade
          </button>
        </div>
        <StandingPills penalties={penalties} />
      </div>
      <h2>Histórico de penalidades</h2>
      {history.isPending ? <LoadingState /> : null}
      {history.isError ? <ErrorState message="Não foi possível carregar o histórico." /> : null}
      {history.data && penalties.length === 0 ? (
        <EmptyState icon={UserCheck} title="Nenhuma penalidade" message="Esta pessoa nunca foi penalizada." />
      ) : null}
      {penalties.length > 0 ? (
        <div className="card">
          {penalties.map((penalty) => (
            <PenaltyRow key={penalty.id} penalty={penalty} moderators={history.data?.moderators ?? new Map()} />
          ))}
        </div>
      ) : null}
      {isPenalizing ? (
        <PenaltyDialog
          profile={profile}
          suggestion={suggestPenalty(penalties)}
          isPending={penalize.isPending}
          onClose={() => setIsPenalizing(false)}
          onConfirm={handlePenalty}
        />
      ) : null}
    </div>
  );
}

async function getPenalizedUsers() {
  const penalties = await getActivePenalties();
  const profiles = await getProfiles(penalties.map((penalty) => penalty.user_id));
  return penalties
    .map((penalty) => ({ penalty, profile: profiles.get(penalty.user_id) }))
    .filter((item): item is { penalty: Penalty; profile: Profile } => item.profile !== undefined);
}

function UserList({ term, onSelect }: Readonly<{ term: string; onSelect: (profile: Profile) => void }>) {
  const isSearching = term.length >= MIN_SEARCH_LENGTH;
  const penalized = useQuery({ queryKey: ['penalties', 'active'], queryFn: getPenalizedUsers, enabled: !isSearching });
  const results = useQuery({ queryKey: ['profiles', term], queryFn: () => searchProfiles(term), enabled: isSearching });
  const query = isSearching ? results : penalized;

  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState message="Não foi possível carregar os usuários." />;

  const rows = isSearching
    ? (results.data ?? []).map((profile) => ({ profile, penalty: null as Penalty | null }))
    : (penalized.data ?? []);
  if (rows.length === 0) {
    return isSearching ? (
      <EmptyState icon={Search} title="Ninguém encontrado" message="Tente outro nome ou nome de usuário." />
    ) : (
      <EmptyState icon={UserCheck} title="Ninguém penalizado agora" message="Busque alguém pelo nome ou nome de usuário para ver o histórico." />
    );
  }

  return (
    <div className="list">
      {isSearching ? null : <h2>Com penalidade ativa</h2>}
      {rows.map(({ profile, penalty }) => (
        <button key={`${profile.id}-${penalty?.id ?? ''}`} type="button" className="card card-button" onClick={() => onSelect(profile)}>
          <div className="row spread">
            <div className="grow">
              <Person profile={profile} />
            </div>
            {penalty ? <span className="pill pill-danger">{penaltyStatus(penalty)}</span> : null}
          </div>
        </button>
      ))}
    </div>
  );
}

export function UsersPage() {
  const [input, setInput] = useState('');
  const [term, setTerm] = useState('');
  const [selected, setSelected] = useState<Profile | null>(null);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setTerm(input.trim());
  };

  return (
    <div className="content">
      <PageHeader title="Usuários" subtitle="Veja o histórico de cada pessoa e aplique ou remova penalidades." />
      {selected ? (
        <UserDetail profile={selected} onBack={() => setSelected(null)} />
      ) : (
        <>
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
          <UserList term={term} onSelect={setSelected} />
        </>
      )}
    </div>
  );
}
