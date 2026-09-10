import { CARE_TASK_CATEGORY, REMINDERS_CHANNEL_ID } from './careTasks';
import { getNotificationsModule } from './notificationsModule';
import { supabase } from './supabase';
import type { CareTask } from '@/types';

const lastScheduledFireTime = new Map<string, number>();

function fireDateFor(task: CareTask): Date {
  const [year, month, day] = task.dueDate.split('-').map(Number);
  return new Date(year, month - 1, day, task.reminderHour, task.reminderMinute, 0, 0);
}

async function logReminderEvent(careTaskId: string, event: 'scheduled' | 'canceled', scheduledFor: Date | null): Promise<void> {
  const { error } = await supabase
    .from('care_reminder_log')
    .insert({ care_task_id: careTaskId, event, scheduled_for: scheduledFor?.toISOString() ?? null });
  if (error) console.warn('[reminders] erro registrando log de auditoria:', error);
}

export async function syncLocalReminders(tasks: CareTask[]): Promise<void> {
  const notifications = await getNotificationsModule();
  if (!notifications) return;

  const activeTasks = tasks.filter((task) => !task.done);
  const activeTaskIds = new Set(activeTasks.map((task) => task.id));

  const scheduled = await notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    if (activeTaskIds.has(notification.identifier)) continue;
    await notifications.cancelScheduledNotificationAsync(notification.identifier);
    lastScheduledFireTime.delete(notification.identifier);
    await logReminderEvent(notification.identifier, 'canceled', null);
  }

  for (const task of activeTasks) {
    const fireDate = fireDateFor(task);
    if (fireDate.getTime() <= Date.now()) continue;
    if (lastScheduledFireTime.get(task.id) === fireDate.getTime()) continue;

    await notifications.cancelScheduledNotificationAsync(task.id);
    await notifications.scheduleNotificationAsync({
      identifier: task.id,
      content: {
        title: task.plantName ? `Hora de cuidar: ${task.plantName}` : task.title,
        body: task.title,
        data: { careTaskId: task.id },
        categoryIdentifier: CARE_TASK_CATEGORY,
      },
      trigger: { type: notifications.SchedulableTriggerInputTypes.DATE, date: fireDate, channelId: REMINDERS_CHANNEL_ID },
    });

    lastScheduledFireTime.set(task.id, fireDate.getTime());
    await logReminderEvent(task.id, 'scheduled', fireDate);
  }
}
