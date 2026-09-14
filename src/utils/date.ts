import { i18n } from '@/i18n';

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function intlLocale(): string {
  return i18n.language === 'en' ? 'en-US' : 'pt-BR';
}

export function addDays(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00`);
  result.setDate(result.getDate() + days);
  return formatLocalDate(result);
}

export function today(): string {
  return formatLocalDate(new Date());
}

export function daysBetween(from: string, to: string): number {
  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T00:00:00`);
  return Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  const dayMonth = date.toLocaleDateString(intlLocale(), { day: '2-digit', month: 'short' });
  return `${dayMonth} ${date.getFullYear()}`;
}

export function formatEventDateTime(iso: string): string {
  const date = new Date(iso);
  const locale = intlLocale();
  const datePart = date.toLocaleDateString(locale, { day: '2-digit', month: 'short' });
  const timePart = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  return `${datePart} ${i18n.t('common:dateTimeJoiner')} ${timePart}`;
}
