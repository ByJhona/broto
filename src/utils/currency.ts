import { i18n } from '@/i18n';

export function formatCurrency(amount: number, currencyCode: string): string {
  const locale = i18n.language === 'en' ? 'en-US' : 'pt-BR';
  return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(amount);
}

export function formatPrice(cents: number): string {
  return formatCurrency(cents / 100, 'BRL');
}
