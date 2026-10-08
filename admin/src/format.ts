import type { AppRole, ContentType, ReportReason } from './types';

const PERMANENT_THRESHOLD_YEARS = 50;

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

export const CONTENT_LABELS: Record<ContentType, string> = {
  post: 'post',
  comment: 'comentário',
  listing: 'anúncio',
  event: 'evento',
};

export function formatDateTime(value: string): string {
  return dateTimeFormat.format(new Date(value));
}

export function formatSuspension(bannedUntil: string): string {
  const until = new Date(bannedUntil);
  const yearsAhead = until.getFullYear() - new Date().getFullYear();
  if (yearsAhead >= PERMANENT_THRESHOLD_YEARS) return 'Suspenso permanentemente';
  return `Suspenso até ${dateFormat.format(until)}`;
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
