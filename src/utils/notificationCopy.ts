import type { Notification } from '@/types';

export function notificationCopy(notification: Notification): { title: string; message: string } {
  const actor = notification.actorName?.trim() || 'Alguém';

  switch (notification.type) {
    case 'like':
      return { title: 'Nova curtida', message: `${actor} acabou de curtir a sua foto!` };
    case 'comment':
      return { title: 'Novo recado', message: `${actor} deixou um recado na sua foto!` };
    case 'listing_interest':
      return { title: 'Interesse na sua oferta', message: `${actor} se interessou pela planta que você ofereceu!` };
    case 'system':
    default:
      return { title: notification.title ?? '', message: notification.message ?? '' };
  }
}
