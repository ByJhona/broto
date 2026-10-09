import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Moon, Sun, SunMoon, type LucideIcon } from 'lucide-react';
import { initials } from './format';
import { readThemeChoice, saveThemeChoice, THEME_CHOICES, type ThemeChoice } from './theme';
import type { Profile } from './types';

type ToastState = { message: string; isError: boolean } | null;

const TOAST_DURATION_MS = 3000;

const ToastContext = createContext<(message: string, isError?: boolean) => void>(() => {});

export function ToastProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [toast, setToast] = useState<ToastState>(null);

  const showToast = useCallback((message: string, isError = false) => setToast({ message, isError }), []);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [toast]);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast ? (
        <div className={toast.isError ? 'toast toast-error' : 'toast'} role="status">
          {toast.message}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

export function PageHeader({ title, subtitle }: Readonly<{ title: string; subtitle: string }>) {
  return (
    <header className="page-header">
      <h1>{title}</h1>
      <p className="muted">{subtitle}</p>
    </header>
  );
}

export function Avatar({ profile, small = false }: Readonly<{ profile: Profile | null; small?: boolean }>) {
  const className = small ? 'avatar avatar-sm' : 'avatar';
  if (profile?.avatar_url) {
    return (
      <span className={className}>
        <img src={profile.avatar_url} alt="" />
      </span>
    );
  }
  return <span className={className}>{initials(profile?.name ?? '?')}</span>;
}

export function Person({ profile, trailing }: Readonly<{ profile: Profile | null; trailing?: ReactNode }>) {
  return (
    <div className="person">
      <Avatar profile={profile} />
      <div className="person-text">
        <span className="person-name">{profile?.name ?? 'Usuário removido'}</span>
        <span className="muted small">{profile ? `@${profile.username}` : 'Conta excluída'}</span>
      </div>
      {trailing}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, message }: Readonly<{ icon: LucideIcon; title: string; message: string }>) {
  return (
    <div className="empty">
      <Icon size={32} strokeWidth={1.5} />
      <h3>{title}</h3>
      <p className="small">{message}</p>
    </div>
  );
}

export function LoadingState() {
  return <p className="muted">Carregando...</p>;
}

export function ErrorState({ message }: Readonly<{ message: string }>) {
  return <p className="error">{message}</p>;
}

type DialogProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function Dialog({ open, title, onClose, children }: Readonly<DialogProps>) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="dialog" onClose={onClose} aria-label={title}>
      {open ? (
        <div className="stack">
          <h2>{title}</h2>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}

export function BrandLogo({ className }: Readonly<{ className: string }>) {
  return (
    <>
      <img className={`${className} logo-light`} src="/logo.svg" alt="Muda Vai Vem" />
      <img className={`${className} logo-dark`} src="/logo-dark.svg" alt="Muda Vai Vem" />
    </>
  );
}

const THEME_OPTIONS: Record<ThemeChoice, { label: string; icon: LucideIcon }> = {
  auto: { label: 'Tema automático', icon: SunMoon },
  light: { label: 'Tema claro', icon: Sun },
  dark: { label: 'Tema escuro', icon: Moon },
};

export function ThemeToggle() {
  const [choice, setChoice] = useState(readThemeChoice);
  const { label, icon: Icon } = THEME_OPTIONS[choice];

  const cycle = () => {
    const next = THEME_CHOICES[(THEME_CHOICES.indexOf(choice) + 1) % THEME_CHOICES.length];
    saveThemeChoice(next);
    setChoice(next);
  };

  return (
    <button type="button" className="nav-item" onClick={cycle}>
      <Icon size={16} strokeWidth={2} />
      {label}
    </button>
  );
}
