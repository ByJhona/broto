import { useState, type FormEvent } from 'react';
import { Dialog } from './components';
import type { Profile } from './types';

const SUSPENSION_OPTIONS: { days: number | null; label: string }[] = [
  { days: 1, label: '1 dia' },
  { days: 7, label: '7 dias' },
  { days: 30, label: '30 dias' },
  { days: null, label: 'Permanente' },
];

function cleanReason(reason: string): string | null {
  return reason.trim() || null;
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
          Motivo (opcional)
          <textarea id="reason-input" className="input" value={reason} onChange={(event) => setReason(event.target.value)} />
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

type SuspendDialogProps = {
  profile: Profile;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (days: number | null, reason: string | null) => void;
};

export function SuspendDialog({ profile, isPending, onClose, onConfirm }: Readonly<SuspendDialogProps>) {
  const [days, setDays] = useState<number | null>(7);
  const [reason, setReason] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onConfirm(days, cleanReason(reason));
  };

  return (
    <Dialog open title={`Suspender @${profile.username}`} onClose={onClose}>
      <form className="stack" onSubmit={handleSubmit}>
        <p className="muted small">A pessoa não consegue mais entrar no app até o fim da suspensão. Quem já está logado sai em até 1 hora.</p>
        <div className="chips" role="group" aria-label="Duração">
          {SUSPENSION_OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              className="chip"
              aria-pressed={days === option.days}
              onClick={() => setDays(option.days)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <label className="field" htmlFor="suspend-reason">
          Motivo (opcional)
          <textarea id="suspend-reason" className="input" value={reason} onChange={(event) => setReason(event.target.value)} />
        </label>
        <div className="dialog-actions">
          <button type="button" className="button button-outline" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="button button-danger" disabled={isPending}>
            Suspender
          </button>
        </div>
      </form>
    </Dialog>
  );
}
