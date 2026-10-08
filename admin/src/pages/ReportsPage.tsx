import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { getReports, type ReportFilter } from '../api';
import { Avatar, EmptyState, ErrorState, LoadingState, PageHeader } from '../components';
import { ReasonDialog, SuspendDialog } from '../dialogs';
import { CONTENT_LABELS, formatDateTime, REASON_LABELS } from '../format';
import { useHideContent, useResolveReport, useSuspendUser } from '../mutations';
import type { ContentReport, ContentType, Profile } from '../types';

type ReportedContent = {
  type: ContentType;
  id: string;
  author: Profile | null;
  text: string | null;
  images: string[];
  createdAt: string;
};

const FILTERS: { value: ReportFilter; label: string }[] = [
  { value: 'open', label: 'Abertas' },
  { value: 'resolved', label: 'Resolvidas' },
];

function reportedContent(report: ContentReport): ReportedContent | null {
  if (report.post) {
    const { id, author, caption, image_urls, created_at } = report.post;
    return { type: 'post', id, author, text: caption, images: image_urls, createdAt: created_at };
  }
  if (report.comment) {
    const { id, author, text, photo_url, created_at } = report.comment;
    return { type: 'comment', id, author, text, images: photo_url ? [photo_url] : [], createdAt: created_at };
  }
  return null;
}

function ContentPreview({ content }: Readonly<{ content: ReportedContent | null }>) {
  if (!content) {
    return <p className="quote muted small">Este conteúdo já foi removido.</p>;
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

type ReportActionsProps = {
  report: ContentReport;
  content: ReportedContent | null;
  onHide: (report: ContentReport) => void;
  onSuspend: (profile: Profile) => void;
};

function ReportActions({ report, content, onHide, onSuspend }: Readonly<ReportActionsProps>) {
  const resolve = useResolveReport();
  const author = content?.author ?? null;

  if (!content) {
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
      <button type="button" className="button button-danger" onClick={() => onHide(report)}>
        Esconder {CONTENT_LABELS[content.type]}
      </button>
      {author ? (
        <button type="button" className="button button-outline" onClick={() => onSuspend(author)}>
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

type ReportCardProps = Omit<ReportActionsProps, 'content'>;

function ReportCard({ report, onHide, onSuspend }: Readonly<ReportCardProps>) {
  const content = reportedContent(report);
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
      {report.status === 'open' ? <ReportActions report={report} content={content} onHide={onHide} onSuspend={onSuspend} /> : null}
    </article>
  );
}

function ReportList({ filter }: Readonly<{ filter: ReportFilter }>) {
  const reports = useQuery({ queryKey: ['reports', filter], queryFn: () => getReports(filter) });
  const hide = useHideContent();
  const suspend = useSuspendUser();
  const [hideTarget, setHideTarget] = useState<ContentReport | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<Profile | null>(null);
  const hideContent = hideTarget ? reportedContent(hideTarget) : null;

  if (reports.isPending) return <LoadingState />;
  if (reports.isError) return <ErrorState message="Não foi possível carregar as denúncias." />;
  if (reports.data.length === 0) {
    return <EmptyState icon={ShieldCheck} title="Nenhuma denúncia aqui" message="Quando alguém denunciar um post ou comentário, ele aparece nesta lista." />;
  }

  const handleHide = (reason: string | null) => {
    if (!hideContent) return;
    hide.mutate({ type: hideContent.type, id: hideContent.id, reason }, { onSuccess: () => setHideTarget(null) });
  };

  const handleSuspend = (days: number | null, reason: string | null) => {
    if (!suspendTarget) return;
    suspend.mutate({ userId: suspendTarget.id, days, reason }, { onSuccess: () => setSuspendTarget(null) });
  };

  return (
    <div className="list">
      {reports.data.map((report) => (
        <ReportCard key={report.id} report={report} onHide={setHideTarget} onSuspend={setSuspendTarget} />
      ))}
      {hideContent ? (
        <ReasonDialog
          title={`Esconder ${CONTENT_LABELS[hideContent.type]}`}
          description="O conteúdo some do app para todo mundo, e as denúncias abertas sobre ele são marcadas como resolvidas."
          confirmLabel="Esconder"
          isPending={hide.isPending}
          onClose={() => setHideTarget(null)}
          onConfirm={handleHide}
        />
      ) : null}
      {suspendTarget ? (
        <SuspendDialog profile={suspendTarget} isPending={suspend.isPending} onClose={() => setSuspendTarget(null)} onConfirm={handleSuspend} />
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

