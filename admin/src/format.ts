import type { AppRole, Penalty, PenaltyKind, ReportReason, ReportTargetType } from './types';

const dateTimeFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });

export const REASON_LABELS: Record<ReportReason, string> = {
  spam: 'Spam',
  inappropriate: 'Conteúdo impróprio',
  scam: 'Golpe',
  other: 'Outro motivo',
};

export const ROLE_LABELS: Record<AppRole, string> = {
  moderator: 'Moderador',
  admin: 'Admin',
};

export const TARGET_LABELS: Record<ReportTargetType, string> = {
  post: 'post',
  comment: 'comentário',
  listing: 'anúncio',
  event: 'evento',
  message: 'mensagem',
  user: 'perfil',
};

export const PENALTY_LABELS: Record<PenaltyKind, string> = {
  warning: 'Aviso',
  restriction: 'Restrição',
  suspension: 'Suspensão',
  ban: 'Banimento',
};

export const PENALTY_EFFECTS: Record<PenaltyKind, string> = {
  warning: 'A pessoa recebe uma notificação com o motivo. Nada é bloqueado, mas o aviso conta no histórico.',
  restriction: 'A pessoa continua usando o app, mas não pode publicar, comentar, anunciar nem mandar mensagens.',
  suspension: 'A pessoa não consegue entrar no app e todo o conteúdo dela fica oculto até o fim do prazo.',
  ban: 'A pessoa não consegue mais entrar no app e todo o conteúdo dela fica oculto para sempre.',
};

export function formatDateTime(value: string): string {
  return dateTimeFormat.format(new Date(value));
}

export function formatDate(value: string): string {
  return dateFormat.format(new Date(value));
}

export function penaltyStatus(penalty: Penalty): string {
  if (penalty.kind === 'ban') return 'Banido';
  const until = penalty.ends_at ? ` até ${formatDate(penalty.ends_at)}` : '';
  if (penalty.kind === 'restriction') return `Restrito${until}`;
  if (penalty.kind === 'suspension') return `Suspenso${until}`;
  return `Aviso em ${formatDate(penalty.created_at)}`;
}

export function strikesLabel(count: number): string {
  if (count === 0) return 'Sem infrações';
  return count === 1 ? '1 infração' : `${count} infrações`;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function errorMessage(fallback: string, error: unknown): string {
  console.error(error);
  return fallback;
}
