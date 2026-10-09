import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { getPenalties, getReports, type ReportFilter } from '../api';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components';
import { PenaltyDialog, ReasonDialog, type PenaltyChoice } from '../dialogs';
import { formatDateTime, REASON_LABELS, TARGET_LABELS } from '../format';
import { canHide, groupReports, penaltiesByUser, suggestPenalty, type ReportGroup } from '../moderation';
import { useApplyPenalty, useHideContent, useResolveReports } from '../mutations';
import { ContentPreview, StandingPills } from '../views';
import type { Penalty } from '../types';

const FILTERS: { value: ReportFilter; label: string }[] = [
  { value: 'open', label: 'Abertas' },
  { value: 'resolved', label: 'Resolvidas' },
];

const NO_PENALTIES: Penalty[] = [];

function reportCountLabel(count: number): string {
  return count === 1 ? '1 denúncia' : `${count} denúncias`;
}

function GroupHeader({ group }: Readonly<{ group: ReportGroup }>) {
  const resolved = group.reports.every((report) => report.status !== 'open');
  return (
    <div className="row spread">
      <div className="row">
        <span className="pill pill-danger">{reportCountLabel(group.reports.length)}</span>
        {group.reasonCounts.map(([reason, count]) => (
          <span key={reason} className="pill">
            {REASON_LABELS[reason]}
            {count > 1 ? ` · ${count}` : ''}
          </span>
        ))}
        {resolved ? <span className="pill pill-leaf">{group.reports[0].status === 'actioned' ? 'Resolvida' : 'Descartada'}</span> : null}
      </div>
      <span className="muted caption">{formatDateTime(group.latestAt)}</span>
    </div>
  );
}

function reporterNames(group: ReportGroup): string {
  const names = group.reports.map((report) => (report.reporter ? `@${report.reporter.username}` : 'usuário removido'));
  return [...new Set(names)].join(', ');
}

type GroupActionsProps = {
  group: ReportGroup;
  onHide: (group: ReportGroup) => void;
  onPenalize: (group: ReportGroup) => void;
};

function GroupActions({ group, onHide, onPenalize }: Readonly<GroupActionsProps>) {
  const resolve = useResolveReports();
  const ids = group.reports.map((report) => report.id);
  const hideable = canHide(group.content) ? group.content : null;
  const author = group.content?.author ?? null;

  return (
    <div className="row">
      {hideable ? (
        <button type="button" className="button button-danger" onClick={() => onHide(group)}>
          Remover {TARGET_LABELS[hideable.type]}
        </button>
      ) : null}
      {author ? (
        <button type="button" className="button button-outline" onClick={() => onPenalize(group)}>
          Penalizar autor
        </button>
      ) : null}
      <button type="button" className="button button-secondary" disabled={resolve.isPending} onClick={() => resolve.mutate({ ids, status: 'dismissed' })}>
        Descartar
      </button>
      {!hideable && !author ? (
        <button type="button" className="button button-secondary" disabled={resolve.isPending} onClick={() => resolve.mutate({ ids, status: 'actioned' })}>
          Marcar como resolvida
        </button>
      ) : null}
    </div>
  );
}

type GroupCardProps = GroupActionsProps & { authorPenalties: Penalty[] };

function GroupCard({ group, authorPenalties, onHide, onPenalize }: Readonly<GroupCardProps>) {
  const isOpen = group.reports.some((report) => report.status === 'open');
  return (
    <article className="card">
      <GroupHeader group={group} />
      <p className="small muted">Denunciado por {reporterNames(group)}</p>
      <ContentPreview content={group.content} />
      <div className="row spread">
        {group.content?.author ? <StandingPills penalties={authorPenalties} /> : <span />}
        {group.content?.isHidden ? <span className="pill pill-leaf">Removido do app</span> : null}
      </div>
      {isOpen ? <GroupActions group={group} onHide={onHide} onPenalize={onPenalize} /> : null}
    </article>
  );
}

function useReportGroups(filter: ReportFilter) {
  const reports = useQuery({ queryKey: ['reports', filter], queryFn: () => getReports(filter) });
  const groups = groupReports(reports.data ?? []);
  const authorIds = groups.map((group) => group.content?.author?.id).filter((id): id is string => id !== undefined);
  const penalties = useQuery({
    queryKey: ['penalties', 'authors', authorIds],
    queryFn: () => getPenalties(authorIds),
    enabled: authorIds.length > 0,
  });
  return { reports, groups, penalties: penaltiesByUser(penalties.data ?? []) };
}

function ReportQueue({ filter }: Readonly<{ filter: ReportFilter }>) {
  const { reports, groups, penalties } = useReportGroups(filter);
  const hide = useHideContent();
  const penalize = useApplyPenalty();
  const [hideTarget, setHideTarget] = useState<ReportGroup | null>(null);
  const [penaltyTarget, setPenaltyTarget] = useState<ReportGroup | null>(null);

  if (reports.isPending) return <LoadingState />;
  if (reports.isError) return <ErrorState message="Não foi possível carregar as denúncias." />;
  if (groups.length === 0) {
    return <EmptyState icon={ShieldCheck} title="Nenhuma denúncia aqui" message="Quando alguém denunciar um conteúdo ou perfil, ele aparece nesta fila." />;
  }

  const penaltiesOf = (group: ReportGroup) => penalties.get(group.content?.author?.id ?? '') ?? NO_PENALTIES;
  const hideContent = hideTarget && canHide(hideTarget.content) ? hideTarget.content : null;
  const penaltyAuthor = penaltyTarget?.content?.author ?? null;

  const handleHide = (reason: string | null) => {
    if (!hideContent) return;
    hide.mutate({ type: hideContent.type, id: hideContent.id, reason }, { onSuccess: () => setHideTarget(null) });
  };

  const handlePenalty = (choice: PenaltyChoice) => {
    if (!penaltyTarget || !penaltyAuthor) return;
    const content = penaltyTarget.content;
    const hideTargetContent = choice.hideContent && canHide(content) ? { type: content.type, id: content.id } : null;
    penalize.mutate(
      {
        userId: penaltyAuthor.id,
        kind: choice.kind,
        days: choice.days,
        reason: choice.reason,
        reportIds: penaltyTarget.reports.filter((report) => report.status === 'open').map((report) => report.id),
        hide: hideTargetContent,
      },
      { onSuccess: () => setPenaltyTarget(null) }
    );
  };

  return (
    <div className="list">
      {groups.map((group) => (
        <GroupCard key={group.key} group={group} authorPenalties={penaltiesOf(group)} onHide={setHideTarget} onPenalize={setPenaltyTarget} />
      ))}
      {hideContent ? (
        <ReasonDialog
          title={`Remover ${TARGET_LABELS[hideContent.type]}`}
          description="O conteúdo some do app para todo mundo, o autor é avisado e todas as denúncias sobre ele são resolvidas. O autor continua com acesso ao app."
          confirmLabel="Remover"
          isPending={hide.isPending}
          onClose={() => setHideTarget(null)}
          onConfirm={handleHide}
        />
      ) : null}
      {penaltyTarget && penaltyAuthor ? (
        <PenaltyDialog
          profile={penaltyAuthor}
          suggestion={suggestPenalty(penaltiesOf(penaltyTarget))}
          hideContentLabel={canHide(penaltyTarget.content) ? `Remover também este ${TARGET_LABELS[penaltyTarget.content.type]}` : undefined}
          isPending={penalize.isPending}
          onClose={() => setPenaltyTarget(null)}
          onConfirm={handlePenalty}
        />
      ) : null}
    </div>
  );
}

export function ReportsPage() {
  const [filter, setFilter] = useState<ReportFilter>('open');

  return (
    <div className="content">
      <PageHeader title="Denúncias" subtitle="Cada item reúne todas as denúncias sobre o mesmo conteúdo ou perfil, os mais denunciados primeiro." />
      <div className="chips" role="group" aria-label="Filtro">
        {FILTERS.map((option) => (
          <button key={option.value} type="button" className="chip" aria-pressed={filter === option.value} onClick={() => setFilter(option.value)}>
            {option.label}
          </button>
        ))}
      </div>
      <ReportQueue filter={filter} />
    </div>
  );
}
