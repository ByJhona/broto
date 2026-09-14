import { i18n } from '@/i18n';

export function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) return i18n.t('common:goodMorning');
  if (hour >= 12 && hour < 18) return i18n.t('common:goodAfternoon');
  return i18n.t('common:goodEvening');
}
