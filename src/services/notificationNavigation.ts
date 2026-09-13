import { router } from 'expo-router';
import { getCareTaskPlantId } from './careTasks';
import { getNotificationById } from './notifications';
import { getNotificationsModule } from './notificationsModule';

type NotificationTapData = {
  careTaskId?: string;
  careTaskIds?: string[];
  notificationId?: string;
};

async function navigateToCareTask(taskId: string): Promise<void> {
  const plantId = await getCareTaskPlantId(taskId);

  if (plantId) {
    router.push(`/plant/${plantId}`);
  } else {
    router.push('/(tabs)');
  }
}

async function handleNotificationTap(data: NotificationTapData): Promise<void> {
  const careTaskId = data.careTaskId ?? data.careTaskIds?.[0];
  if (careTaskId) {
    await navigateToCareTask(careTaskId);
    return;
  }

  if (data.notificationId) {
    const notification = await getNotificationById(data.notificationId);
    if (notification?.postId) {
      router.push({ pathname: '/post/[id]', params: { id: notification.postId } });
    } else if (notification?.type === 'listing_message' && notification.actorId) {
      router.push({ pathname: '/chat', params: { otherUserId: notification.actorId } });
    } else if (notification?.listingId) {
      router.push({ pathname: '/listing/[id]', params: { id: notification.listingId } });
    } else {
      router.push('/(tabs)/community');
    }
  }
}

export async function registerNotificationTapHandler(): Promise<void> {
  const notifications = await getNotificationsModule();
  if (!notifications) return;

  notifications.addNotificationResponseReceivedListener((response) => {
    if (response.actionIdentifier !== notifications.DEFAULT_ACTION_IDENTIFIER) return;

    handleNotificationTap(response.notification.request.content.data as NotificationTapData);
  });

  const launchResponse = await notifications.getLastNotificationResponseAsync();
  if (launchResponse && launchResponse.actionIdentifier === notifications.DEFAULT_ACTION_IDENTIFIER) {
    handleNotificationTap(launchResponse.notification.request.content.data as NotificationTapData);
  }
}
