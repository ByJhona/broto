import type { NotificationResponse } from 'expo-notifications';
import { i18n } from '@/i18n';
import { addDays, daysBetween, today } from '@/utils';
import { recordCareTaskCompletion } from './careStreak';
import { removeTaskFromDeviceCalendar, syncTaskToDeviceCalendar } from './deviceCalendar';
import { getNotificationsModule } from './notificationsModule';
import { queryClient } from './queryClient';
import { ensureWriteApplied } from './writeGuard';
import { getCurrentUserId, supabase } from './supabase';
import type { CareTask, TaskCategory } from '@/types';

const DEFAULT_REMINDER_HOUR = 9;
const DEFAULT_REMINDER_MINUTE = 0;

type CareTaskRow = {
  id: string;
  plant_id: string | null;
  title: string;
  plant_name: string | null;
  plant_photo_url: string | null;
  category: TaskCategory;
  notes: string | null;
  start_date: string;
  recurrence_days: number | null;
  reminder_hour: number;
  reminder_minute: number;
  last_completed_occurrence: string | null;
};

const CARE_TASK_SELECT =
  'id, plant_id, title, plant_name, plant_photo_url, category, notes, start_date, recurrence_days, reminder_hour, reminder_minute, last_completed_occurrence';

export type CreateCareTaskInput = {
  title: string;
  plantId?: string | null;
  plantName?: string | null;
  plantPhotoUrl?: string | null;
  category: TaskCategory;
  notes?: string | null;
  recurrenceDays?: number | null;
  reminderHour?: number;
  reminderMinute?: number;
};

function currentOccurrenceDate(row: Pick<CareTaskRow, 'start_date' | 'recurrence_days'>, todayDate: string): string {
  if (!row.recurrence_days) return row.start_date;

  const elapsedDays = daysBetween(row.start_date, todayDate);
  if (elapsedDays <= 0) return row.start_date;

  const cyclesPassed = Math.floor(elapsedDays / row.recurrence_days);
  return addDays(row.start_date, cyclesPassed * row.recurrence_days);
}

function toCareTask(row: CareTaskRow, todayDate: string): CareTask {
  const dueDate = currentOccurrenceDate(row, todayDate);
  return {
    id: row.id,
    title: row.title,
    plantId: row.plant_id,
    plantName: row.plant_name,
    plantPhotoUrl: row.plant_photo_url,
    category: row.category,
    notes: row.notes,
    dueDate,
    recurrenceDays: row.recurrence_days,
    reminderHour: row.reminder_hour,
    reminderMinute: row.reminder_minute,
    done: row.last_completed_occurrence === dueDate,
    lastCompletedOccurrence: row.last_completed_occurrence,
  };
}

export async function getCareTasks(): Promise<CareTask[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const todayDate = today();
  const { data, error } = await supabase
    .from('care_tasks')
    .select(CARE_TASK_SELECT)
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (error) throw error;

  return (data as CareTaskRow[])
    .map((row) => toCareTask(row, todayDate))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export async function toggleCareTask(task: CareTask, done: boolean): Promise<void> {
  const { error, count } = await supabase
    .from('care_tasks')
    .update({ last_completed_occurrence: done ? task.dueDate : null }, { count: 'exact' })
    .eq('id', task.id);

  ensureWriteApplied({ error, count });
  if (done) await recordCareTaskCompletion();
}

export async function getCareTaskPlantId(id: string): Promise<string | null> {
  const { data } = await supabase.from('care_tasks').select('plant_id').eq('id', id).is('deleted_at', null).maybeSingle();
  return data?.plant_id ?? null;
}

export async function markCareTaskDoneById(id: string, occurrence?: string): Promise<boolean> {
  const { data: row, error } = await supabase
    .from('care_tasks')
    .select(CARE_TASK_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error || !row) {
    if (error) console.error(error);
    return false;
  }

  const dueDate = occurrence ?? currentOccurrenceDate(row as CareTaskRow, today());

  const { error: updateError, count } = await supabase
    .from('care_tasks')
    .update({ last_completed_occurrence: dueDate }, { count: 'exact' })
    .eq('id', id);
  if (updateError || !count) {
    if (updateError) console.error(updateError);
    return false;
  }

  await recordCareTaskCompletion();
  return true;
}

export const CARE_TASK_CATEGORY = 'care-task';
const MARK_DONE_ACTION = 'mark-done';
export const REMINDERS_CHANNEL_ID = 'reminders';

type CareReminderData = { careTaskId?: string; occurrence?: string };

async function handleMarkDoneResponse(response: NotificationResponse): Promise<void> {
  if (response.actionIdentifier !== MARK_DONE_ACTION) return;

  const notifications = await getNotificationsModule();
  notifications?.clearLastNotificationResponse();

  const data = response.notification.request.content.data as CareReminderData | undefined;
  if (!data?.careTaskId) return;

  const marked = await markCareTaskDoneById(data.careTaskId, data.occurrence);
  if (!marked) return;

  await notifications?.dismissNotificationAsync(response.notification.request.identifier);
  queryClient.invalidateQueries({ queryKey: ['care-tasks'] });
  queryClient.invalidateQueries({ queryKey: ['care-streak'] });
}

export async function registerCareReminderChannel(): Promise<void> {
  const notifications = await getNotificationsModule();
  if (!notifications) return;

  await Promise.all([
    notifications.setNotificationChannelAsync(REMINDERS_CHANNEL_ID, {
      name: i18n.t('garden:remindersChannelName'),
      importance: notifications.AndroidImportance.HIGH,
    }),
    notifications.setNotificationCategoryAsync(CARE_TASK_CATEGORY, [
      { identifier: MARK_DONE_ACTION, buttonTitle: i18n.t('garden:reminderMarkDone'), options: { opensAppToForeground: false } },
    ]),
  ]);
}

export async function registerCareTaskNotificationHandlers(): Promise<void> {
  const notifications = await getNotificationsModule();
  if (!notifications) return;

  notifications.addNotificationResponseReceivedListener(handleMarkDoneResponse);

  const launchResponse = await notifications.getLastNotificationResponseAsync();
  if (launchResponse) await handleMarkDoneResponse(launchResponse);
}

export async function createCareTask(input: CreateCareTaskInput): Promise<CareTask> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error(i18n.t('common:notAuthenticated'));

  const startDate = today();
  const recurrenceDays = input.recurrenceDays ?? null;
  const reminderHour = input.reminderHour ?? DEFAULT_REMINDER_HOUR;
  const reminderMinute = input.reminderMinute ?? DEFAULT_REMINDER_MINUTE;

  const { data: row, error } = await supabase
    .from('care_tasks')
    .insert({
      plant_id: input.plantId ?? null,
      title: input.title,
      plant_name: input.plantName ?? null,
      plant_photo_url: input.plantPhotoUrl ?? null,
      category: input.category,
      notes: input.notes ?? null,
      start_date: startDate,
      recurrence_days: recurrenceDays,
      reminder_hour: reminderHour,
      reminder_minute: reminderMinute,
    })
    .select(CARE_TASK_SELECT)
    .single();

  if (error) throw error;

  const task = toCareTask(row as CareTaskRow, startDate);

  const deviceEventId = await syncTaskToDeviceCalendar(task);
  if (deviceEventId) {
    await supabase.from('care_tasks').update({ device_calendar_event_id: deviceEventId }).eq('id', task.id);
  }

  return task;
}

export async function deleteCareTask(id: string): Promise<void> {
  const { data: existing } = await supabase.from('care_tasks').select('device_calendar_event_id').eq('id', id).maybeSingle();
  if (existing?.device_calendar_event_id) {
    await removeTaskFromDeviceCalendar(existing.device_calendar_event_id);
  }

  ensureWriteApplied(
    await supabase.from('care_tasks').update({ deleted_at: new Date().toISOString() }, { count: 'exact' }).eq('id', id)
  );
}
