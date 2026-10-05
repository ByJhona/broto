import { router, type Href } from 'expo-router';
import type { Notification } from '@/types';
import { getCareTaskPlantId } from './careTasks';
import { getNotificationById } from './notifications';
import { getNotificationsModule } from './notificationsModule';

type NotificationTapData = {
  careTaskId?: string;
  chatUserId?: string;
  notificationId?: string;
};

const PROMO_NOTIFICATION_TYPES = new Set<Notification['type']>(['promo_winner', 'promo_result']);

export function notificationHref(notification: Notification): Href | null {
  if (PROMO_NOTIFICATION_TYPES.has(notification.type)) return '/profile/redeem-code';
  if (notification.postId) return { pathname: '/post/[id]', params: { id: notification.postId } };
  if (notification.listingId) return { pathname: '/listing/[id]', params: { id: notification.listingId } };
  if (notification.plantId) return { pathname: '/plant/[id]', params: { id: notification.plantId } };
  return null;
}

async function navigateToCareTask(taskId: string): Promise<void> {
  const plantId = await getCareTaskPlantId(taskId);

  if (plantId) {
    router.push(`/plant/${plantId}`);
  } else {
    router.push('/(tabs)');
  }
}

async function handleNotificationTap(data: NotificationTapData): Promise<void> {
  if (data.careTaskId) {
    await navigateToCareTask(data.careTaskId);
    return;
  }

  if (data.chatUserId) {
    router.push({ pathname: '/chat', params: { otherUserId: data.chatUserId } });
    return;
  }

  if (data.notificationId) {
    const notification = await getNotificationById(data.notificationId);
    router.push((notification && notificationHref(notification)) ?? '/(tabs)/community');
  }
}

export async function registerNotificationTapHandler(): Promise<void> {
  const notifications = await getNotificationsModule();
  if (!notifications) return;

  notifications.addNotificationResponseReceivedListener((response) => {
    if (response.actionIdentifier !== notifications.DEFAULT_ACTION_IDENTIFIER) return;

    handleNotificationTap(response.notification.request.content.data as NotificationTapData);
  });
}

export async function handleLaunchNotification(): Promise<void> {
  const notifications = await getNotificationsModule();
  if (!notifications) return;

  const launchResponse = await notifications.getLastNotificationResponseAsync();
  if (launchResponse && launchResponse.actionIdentifier === notifications.DEFAULT_ACTION_IDENTIFIER) {
    handleNotificationTap(launchResponse.notification.request.content.data as NotificationTapData);
  }
}
