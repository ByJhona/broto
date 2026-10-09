import { useState, type FormEvent } from 'react';
import { Dialog } from './components';
import { PENALTY_EFFECTS, PENALTY_LABELS } from './format';
import type { PenaltySuggestion } from './moderation';
import type { PenaltyKind, Profile } from './types';

const PENALTY_KINDS: PenaltyKind[] = ['warning', 'restriction', 'suspension', 'ban'];
const DURATION_OPTIONS = [1, 7, 30];
const DEFAULT_DURATION = 7;

function cleanReason(reason: string): string | null {
  return reason.trim() || null;
}

function needsDuration(kind: PenaltyKind): boolean {
  return kind === 'restriction' || kind === 'suspension';
}

type ReasonDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (reason: string | null) => void;
};

export function ReasonDialog({ title, description, confirmLabel, isPending, onClose, onConfirm }: Readonly<ReasonDialogProps>) {
  const [reason, setReason] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onConfirm(cleanReason(reason));
  };

  return (
    <Dialog open title={title} onClose={onClose}>
      <form className="stack" onSubmit={handleSubmit}>
        <p className="muted small">{description}</p>
        <label className="field" htmlFor="reason-input">
          Motivo (aparece para a pessoa)
          <textarea id="reason-input" className="input" data-autofocus value={reason} onChange={(event) => setReason(event.target.value)} />
        </label>
        <div className="dialog-actions">
          <button type="button" className="button button-outline" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="button button-danger" disabled={isPending}>
            {confirmLabel}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export type PenaltyChoice = {
  kind: PenaltyKind;
  days: number | null;
  reason: string | null;
  hideContent: boolean;
};

type PenaltyDialogProps = {
  profile: Profile;
  suggestion: PenaltySuggestion;
  hideContentLabel?: string;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (choice: PenaltyChoice) => void;
};

function KindChips({ kind, suggested, onChange }: Readonly<{ kind: PenaltyKind; suggested: PenaltyKind; onChange: (kind: PenaltyKind) => void }>) {
  return (
    <div className="chips" role="group" aria-label="Penalidade">
      {PENALTY_KINDS.map((option) => (
        <button key={option} type="button" className="chip" aria-pressed={kind === option} onClick={() => onChange(option)}>
          {PENALTY_LABELS[option]}
          {option === suggested ? ' · sugerido' : ''}
        </button>
      ))}
    </div>
  );
}

function DurationChips({ days, onChange }: Readonly<{ days: number; onChange: (days: number) => void }>) {
  return (
    <div className="chips" role="group" aria-label="Duração">
      {DURATION_OPTIONS.map((option) => (
        <button key={option} type="button" className="chip" aria-pressed={days === option} onClick={() => onChange(option)}>
          {option === 1 ? '1 dia' : `${option} dias`}
        </button>
      ))}
    </div>
  );
}

export function PenaltyDialog({ profile, suggestion, hideContentLabel, isPending, onClose, onConfirm }: Readonly<PenaltyDialogProps>) {
  const [kind, setKind] = useState<PenaltyKind>(suggestion.kind);
  const [days, setDays] = useState(suggestion.days ?? DEFAULT_DURATION);
  const [reason, setReason] = useState('');
  const [hideContent, setHideContent] = useState(true);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onConfirm({
      kind,
      days: needsDuration(kind) ? days : null,
      reason: cleanReason(reason),
      hideContent: hideContentLabel !== undefined && hideContent,
    });
  };

  return (
    <Dialog open title={`Penalidade para @${profile.username}`} onClose={onClose}>
      <form className="stack" onSubmit={handleSubmit}>
        <KindChips kind={kind} suggested={suggestion.kind} onChange={setKind} />
        <p className="muted small">{PENALTY_EFFECTS[kind]}</p>
        {needsDuration(kind) ? <DurationChips days={days} onChange={setDays} /> : null}
        <label className="field" htmlFor="penalty-reason">
          Motivo (aparece para a pessoa)
          <textarea id="penalty-reason" className="input" data-autofocus value={reason} onChange={(event) => setReason(event.target.value)} />
        </label>
        {hideContentLabel ? (
          <label className="checkbox" htmlFor="penalty-hide-content">
            <input id="penalty-hide-content" type="checkbox" checked={hideContent} onChange={(event) => setHideContent(event.target.checked)} />
            {hideContentLabel}
          </label>
        ) : null}
        <div className="dialog-actions">
          <button type="button" className="button button-outline" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="button button-danger" disabled={isPending}>
            Aplicar {PENALTY_LABELS[kind].toLowerCase()}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
