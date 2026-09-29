import Constants from 'expo-constants';
import { isActiveChatPush } from './activeChat';

export type NotificationsModule = typeof import('expo-notifications');

let notificationsModule: NotificationsModule | null | undefined;

export async function getNotificationsModule(): Promise<NotificationsModule | null> {
  if (notificationsModule === undefined) {
    if (Constants.appOwnership === 'expo') {
      notificationsModule = null;
    } else {
      try {
        notificationsModule = await import('expo-notifications');
        notificationsModule.setNotificationHandler({
          handleNotification: async (notification) => {
            const shouldAlert = !isActiveChatPush(notification.request.content.data);
            return {
              shouldShowBanner: shouldAlert,
              shouldShowList: shouldAlert,
              shouldPlaySound: shouldAlert,
              shouldSetBadge: false,
            };
          },
        });
      } catch {
        notificationsModule = null;
      }
    }
  }
  return notificationsModule;
}
