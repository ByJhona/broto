export type Locale = 'en' | 'pt';

export function resolveLocale(value: string | null | undefined): Locale {
  return value === 'en' ? 'en' : 'pt';
}
