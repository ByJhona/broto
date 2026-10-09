import { Avatar } from './components';
import { formatDateTime, penaltyStatus, strikesLabel, TARGET_LABELS } from './format';
import { activePenalty, strikeCount, type ReportedContent } from './moderation';
import type { Penalty } from './types';

export function ContentPreview({ content }: Readonly<{ content: ReportedContent | null }>) {
  if (!content) {
    return <p className="quote muted small">Este conteúdo foi apagado definitivamente.</p>;
  }
  const meta = content.createdAt ? ` · ${TARGET_LABELS[content.type]} · ${formatDateTime(content.createdAt)}` : ` · ${TARGET_LABELS[content.type]}`;
  return (
    <div className="quote">
      <div className="row">
        <Avatar profile={content.author} small />
        <span className="small">
          <strong>{content.author?.name ?? 'Usuário removido'}</strong>
          <span className="muted">
            {content.author ? ` @${content.author.username}` : ''}
            {meta}
          </span>
        </span>
      </div>
      {content.title ? <h3>{content.title}</h3> : null}
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

export function StandingPills({ penalties }: Readonly<{ penalties: Penalty[] }>) {
  const active = activePenalty(penalties);
  const strikes = strikeCount(penalties);
  return (
    <div className="row">
      {active ? <span className="pill pill-danger">{penaltyStatus(active)}</span> : null}
      <span className={strikes > 0 ? 'pill pill-primary' : 'pill'}>{strikesLabel(strikes)}</span>
    </div>
  );
}
