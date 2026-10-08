import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { getReports, getSuspensions, type ReportFilter } from '../api';
import { Avatar, EmptyState, ErrorState, LoadingState, PageHeader } from '../components';
import { ReasonDialog, SuspendDialog } from '../dialogs';
import { CONTENT_LABELS, formatDateTime, formatSuspension, REASON_LABELS } from '../format';
import { useHideContent, useResolveReport, useSuspendFromReport } from '../mutations';
import type { ContentReport, ContentType, Profile } from '../types';

type ReportedContent = {
  type: ContentType;
  id: string;
  author: Profile | null;
  text: string | null;
  images: string[];
  createdAt: string;
  isHidden: boolean;
};

type CardOutcome = {
  content: ReportedContent | null;
  authorBannedUntil: string | undefined;
};

const FILTERS: { value: ReportFilter; label: string }[] = [
  { value: 'open', label: 'Abertas' },
  { value: 'resolved', label: 'Resolvidas' },
];

function reportedContent(report: ContentReport): ReportedContent | null {
  if (report.post) {
    const { id, author, caption, image_urls, created_at, deleted_at } = report.post;
    return { type: 'post', id, author, text: caption, images: image_urls, createdAt: created_at, isHidden: deleted_at !== null };
  }
  if (report.comment) {
    const { id, author, text, photo_url, created_at, deleted_at } = report.comment;
    const images = photo_url ? [photo_url] : [];
    return { type: 'comment', id, author, text, images, createdAt: created_at, isHidden: deleted_at !== null };
  }
  return null;
}

function authorIds(reports: ContentReport[]): string[] {
  return reports.map((report) => reportedContent(report)?.author?.id).filter((id): id is string => id !== undefined);
}

function OutcomePills({ content, authorBannedUntil }: Readonly<CardOutcome>) {
  if (!content?.isHidden && !authorBannedUntil) return null;
  return (
    <div className="row">
      {content?.isHidden ? <span className="pill pill-leaf">Escondido do app</span> : null}
      {authorBannedUntil ? <span className="pill pill-danger">Autor: {formatSuspension(authorBannedUntil).toLowerCase()}</span> : null}
    </div>
  );
}

function ContentPreview({ content }: Readonly<{ content: ReportedContent | null }>) {
  if (!content) {
    return <p className="quote muted small">Este conteúdo foi apagado definitivamente.</p>;
  }
  return (
    <div className="quote">
      <div className="row">
        <Avatar profile={content.author} small />
        <span className="small">
          <strong>{content.author?.name ?? 'Usuário removido'}</strong>
          <span className="muted"> · {CONTENT_LABELS[content.type]} · {formatDateTime(content.createdAt)}</span>
        </span>
      </div>
      {content.text ? <p className="quote-text">{content.text}</p> : null}
      {content.images.length > 0 ? (
        <div className="thumbs">
          {content.images.map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              <img src={url} alt="" />
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type ReportActionsProps = CardOutcome & {
  report: ContentReport;
  onHide: (report: ContentReport) => void;
  onSuspend: (report: ContentReport) => void;
};

function ReportActions({ report, content, authorBannedUntil, onHide, onSuspend }: Readonly<ReportActionsProps>) {
  const resolve = useResolveReport();
  const canHide = content !== null && !content.isHidden;
  const canSuspend = content?.author != null && !authorBannedUntil;

  if (!canHide && !canSuspend) {
    return (
      <div className="row">
        <button type="button" className="button button-secondary" onClick={() => resolve.mutate({ id: report.id, status: 'actioned' })}>
          Marcar como resolvida
        </button>
      </div>
    );
  }

  return (
    <div className="row">
      {canHide ? (
        <button type="button" className="button button-danger" onClick={() => onHide(report)}>
          Esconder {CONTENT_LABELS[content.type]}
        </button>
      ) : null}
      {canSuspend ? (
        <button type="button" className="button button-outline" onClick={() => onSuspend(report)}>
          Suspender autor
        </button>
      ) : null}
      <button
        type="button"
        className="button button-secondary"
        disabled={resolve.isPending}
        onClick={() => resolve.mutate({ id: report.id, status: 'dismissed' })}
      >
        Descartar denúncia
      </button>
    </div>
  );
}

function ReportStatusPill({ report }: Readonly<{ report: ContentReport }>) {
  if (report.status === 'open') return null;
  const label = report.status === 'actioned' ? 'Resolvida' : 'Descartada';
  return <span className={report.status === 'actioned' ? 'pill pill-leaf' : 'pill'}>{label}</span>;
}

function ReportCard(props: Readonly<ReportActionsProps>) {
  const { report, content, authorBannedUntil } = props;
  return (
    <article className="card">
      <div className="row spread">
        <div className="row">
          <span className="pill pill-danger">{REASON_LABELS[report.reason]}</span>
          <ReportStatusPill report={report} />
        </div>
        <span className="muted caption">{formatDateTime(report.created_at)}</span>
      </div>
      <p className="small muted">Denunciado por {report.reporter ? `@${report.reporter.username}` : 'usuário removido'}</p>
      <ContentPreview content={content} />
      <OutcomePills content={content} authorBannedUntil={authorBannedUntil} />
      {report.status === 'open' ? <ReportActions {...props} /> : null}
    </article>
  );
}

function useReportsWithOutcome(filter: ReportFilter) {
  const reports = useQuery({ queryKey: ['reports', filter], queryFn: () => getReports(filter) });
  const ids = authorIds(reports.data ?? []);
  const suspensions = useQuery({
    queryKey: ['suspensions', 'authors', ids],
    queryFn: () => getSuspensions(ids),
    enabled: ids.length > 0,
  });
  return { reports, suspensions: suspensions.data ?? new Map<string, string>() };
}

function ReportList({ filter }: Readonly<{ filter: ReportFilter }>) {
  const { reports, suspensions } = useReportsWithOutcome(filter);
  const hide = useHideContent();
  const suspend = useSuspendFromReport();
  const [hideTarget, setHideTarget] = useState<ContentReport | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<ContentReport | null>(null);
  const hideContent = hideTarget ? reportedContent(hideTarget) : null;
  const suspendContent = suspendTarget ? reportedContent(suspendTarget) : null;

  if (reports.isPending) return <LoadingState />;
  if (reports.isError) return <ErrorState message="Não foi possível carregar as denúncias." />;
  if (reports.data.length === 0) {
    return <EmptyState icon={ShieldCheck} title="Nenhuma denúncia aqui" message="Quando alguém denunciar um post ou comentário, ele aparece nesta lista." />;
  }

  const handleHide = (reason: string | null) => {
    if (!hideContent) return;
    hide.mutate({ type: hideContent.type, id: hideContent.id, reason }, { onSuccess: () => setHideTarget(null) });
  };

  const handleSuspend = (days: number | null, reason: string | null, shouldHide: boolean) => {
    if (!suspendTarget || !suspendContent?.author) return;
    const content = shouldHide ? { type: suspendContent.type, id: suspendContent.id } : null;
    suspend.mutate(
      { reportId: suspendTarget.id, content, userId: suspendContent.author.id, days, reason },
      { onSuccess: () => setSuspendTarget(null) }
    );
  };

  return (
    <div className="list">
      {reports.data.map((report) => {
        const content = reportedContent(report);
        const authorBannedUntil = content?.author ? suspensions.get(content.author.id) : undefined;
        return (
          <ReportCard
            key={report.id}
            report={report}
            content={content}
            authorBannedUntil={authorBannedUntil}
            onHide={setHideTarget}
            onSuspend={setSuspendTarget}
          />
        );
      })}
      {hideContent ? (
        <ReasonDialog
          title={`Esconder ${CONTENT_LABELS[hideContent.type]}`}
          description="O conteúdo some do app para todo mundo, e as denúncias abertas sobre ele são marcadas como resolvidas. O autor continua com acesso ao app."
          confirmLabel="Esconder"
          isPending={hide.isPending}
          onClose={() => setHideTarget(null)}
          onConfirm={handleHide}
        />
      ) : null}
      {suspendContent?.author ? (
        <SuspendDialog
          profile={suspendContent.author}
          hideContentLabel={suspendContent.isHidden ? undefined : `Esconder também este ${CONTENT_LABELS[suspendContent.type]}`}
          isPending={suspend.isPending}
          onClose={() => setSuspendTarget(null)}
          onConfirm={handleSuspend}
        />
      ) : null}
    </div>
  );
}

export function ReportsPage() {
  const [filter, setFilter] = useState<ReportFilter>('open');

  return (
    <div className="content">
      <PageHeader title="Denúncias" subtitle="Posts e comentários que a comunidade marcou como problema." />
      <div className="chips" role="group" aria-label="Filtro">
        {FILTERS.map((option) => (
          <button key={option.value} type="button" className="chip" aria-pressed={filter === option.value} onClick={() => setFilter(option.value)}>
            {option.label}
          </button>
        ))}
      </div>
      <ReportList filter={filter} />
    </div>
  );
}
