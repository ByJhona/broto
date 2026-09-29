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

export function formatLongDate(date: Date): string {
  return date.toLocaleDateString(intlLocale(), { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString(intlLocale(), { hour: '2-digit', minute: '2-digit' });
}

export function formatEventDateTime(iso: string): string {
  const date = new Date(iso);
  const locale = intlLocale();
  const datePart = date.toLocaleDateString(locale, { day: '2-digit', month: 'short' });
  const timePart = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  return `${datePart} ${i18n.t('common:dateTimeJoiner')} ${timePart}`;
}

export function formatRelativeDay(date: Date): string {
  const dayOffset = daysBetween(formatLocalDate(date), today());
  if (dayOffset === 0) return i18n.t('common:today');
  if (dayOffset === 1) return i18n.t('common:yesterday');
  return formatLongDate(date);
}

export function formatTimeAgo(iso: string): string {
  const date = new Date(iso);
  const diffInMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffInMinutes < 1) return i18n.t('common:timeJustNow');
  if (diffInMinutes < 60) return i18n.t('common:timeMinutesAgo', { count: diffInMinutes });

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return i18n.t('common:timeHoursAgo', { count: diffInHours });

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return i18n.t('common:timeYesterday');
  if (diffInDays < 7) return i18n.t('common:timeDaysAgo', { count: diffInDays });

  return date.toLocaleDateString(intlLocale());
}

export function formatMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString(intlLocale(), { month: 'long', year: 'numeric' });
}
