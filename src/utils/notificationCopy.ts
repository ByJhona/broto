import { i18n } from '@/i18n';
import type { Notification } from '@/types';

export type NotificationCopy = {
  actor: string | null;
  text: string;
  detail: string | null;
};

function actorCopy(notification: Notification, actionKey: string): NotificationCopy {
  const actor = notification.actorName?.trim() || i18n.t('common:someone');
  return { actor, text: i18n.t(actionKey), detail: null };
}

export function notificationCopy(notification: Notification): NotificationCopy {
  switch (notification.type) {
    case 'like':
      return actorCopy(notification, 'notifications:likeAction');
    case 'comment':
      return actorCopy(notification, 'notifications:commentAction');
    case 'listing_interest':
      return actorCopy(notification, 'notifications:listingInterestAction');
    case 'care_setup_reminder': {
      const plant = notification.plantName?.trim();
      return {
        actor: null,
        text: i18n.t('notifications:careSetupReminderTitle'),
        detail: plant
          ? i18n.t('notifications:careSetupReminderMessage', { plant })
          : i18n.t('notifications:careSetupReminderMessageGeneric'),
      };
    }
    case 'system':
    case 'care_reminder':
    default:
      return {
        actor: null,
        text: notification.title ?? notification.message ?? '',
        detail: notification.title ? notification.message : null,
      };
  }
}
