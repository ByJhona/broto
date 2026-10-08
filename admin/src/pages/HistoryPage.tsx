import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { getModerationActions, getProfiles } from '../api';
import { Avatar, EmptyState, ErrorState, LoadingState, PageHeader } from '../components';
import { CONTENT_LABELS, formatDateTime, ROLE_LABELS } from '../format';
import type { ModerationAction, ModerationActionType, Profile } from '../types';

type Describe = (action: ModerationAction, target: string) => string;

const DESCRIPTIONS: Record<ModerationActionType, Describe> = {
  hide_content: (action, target) => `escondeu um ${CONTENT_LABELS[action.content_type ?? 'post']} de ${target}`,
  resolve_report: (action) => (action.details.status === 'dismissed' ? 'descartou uma denúncia' : 'resolveu uma denúncia'),
  suspend_user: (action, target) =>
    action.details.days ? `suspendeu ${target} por ${action.details.days} dias` : `suspendeu ${target} permanentemente`,
  unsuspend_user: (_action, target) => `reativou ${target}`,
  set_role: (action, target) => `tornou ${target} ${ROLE_LABELS[action.details.role ?? 'moderator']}`,
  remove_role: (_action, target) => `removeu o papel de ${target}`,
};

function handle(profile: Profile | undefined): string {
  return profile ? `@${profile.username}` : 'um usuário removido';
}

async function getHistory() {
  const actions = await getModerationActions();
  const ids = actions.flatMap((action) => [action.moderator_id, action.target_user_id]).filter((id): id is string => id !== null);
  return { actions, profiles: await getProfiles(ids) };
}

function HistoryItem({ action, profiles }: Readonly<{ action: ModerationAction; profiles: Map<string, Profile> }>) {
  const moderator = action.moderator_id ? profiles.get(action.moderator_id) : undefined;
  const target = action.target_user_id ? profiles.get(action.target_user_id) : undefined;

  return (
    <div className="history-item">
      <Avatar profile={moderator ?? null} small />
      <div className="grow">
        <p className="small">
          <strong>{moderator?.name ?? 'Moderador removido'}</strong> {DESCRIPTIONS[action.action](action, handle(target))}
        </p>
        {action.reason ? <p className="small muted">Motivo: {action.reason}</p> : null}
        <p className="caption muted">{formatDateTime(action.created_at)}</p>
      </div>
    </div>
  );
}

export function HistoryPage() {
  const history = useQuery({ queryKey: ['history'], queryFn: getHistory });

  return (
    <div className="content">
      <PageHeader title="Histórico" subtitle="Tudo o que a equipe de moderação fez, do mais recente ao mais antigo." />
      {history.isPending ? <LoadingState /> : null}
      {history.isError ? <ErrorState message="Não foi possível carregar o histórico." /> : null}
      {history.data?.actions.length === 0 ? (
        <EmptyState icon={History} title="Nada por aqui ainda" message="As ações de moderação aparecem nesta lista assim que forem feitas." />
      ) : null}
      {history.data && history.data.actions.length > 0 ? (
        <div className="card">
          {history.data.actions.map((action) => (
            <HistoryItem key={action.id} action={action} profiles={history.data.profiles} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
