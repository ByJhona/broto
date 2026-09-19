import { i18n } from '@/i18n';
import type { Notification } from '@/types';

export function notificationCopy(notification: Notification): { title: string; message: string } {
  const actor = notification.actorName?.trim() || i18n.t('common:someone');

  switch (notification.type) {
    case 'like':
      return { title: i18n.t('notifications:likeTitle'), message: i18n.t('notifications:likeMessage', { actor }) };
    case 'comment':
      return { title: i18n.t('notifications:commentTitle'), message: i18n.t('notifications:commentMessage', { actor }) };
    case 'listing_interest':
      return {
        title: i18n.t('notifications:listingInterestTitle'),
        message: i18n.t('notifications:listingInterestMessage', { actor }),
      };
    case 'care_setup_reminder': {
      const plant = notification.plantName?.trim();
      return {
        title: i18n.t('notifications:careSetupReminderTitle'),
        message: plant
          ? i18n.t('notifications:careSetupReminderMessage', { plant })
          : i18n.t('notifications:careSetupReminderMessageGeneric'),
      };
    }
    case 'system':
    default:
      return { title: notification.title ?? '', message: notification.message ?? '' };
  }
}
