import { i18n } from '@/i18n';

export function formatPrice(cents: number): string {
  const locale = i18n.language === 'en' ? 'en-US' : 'pt-BR';
  const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL' });
  return formatter.format(cents / 100);
}
