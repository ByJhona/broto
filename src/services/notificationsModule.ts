import Constants from 'expo-constants';

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
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });
      } catch {
        notificationsModule = null;
      }
    }
  }
  return notificationsModule;
}
