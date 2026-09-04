import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDays, daysBetween, today } from '@/utils';
import { deleteMostRecentCompletion, recordTaskCompletion } from './careTaskHistory';
import { getNotificationsModule } from './notificationsModule';
import { supabase } from './supabase';
import type { CareTask, TaskCategory } from '@/types';

const LEGACY_STORAGE_KEY = '@broto/care_tasks';
const CACHE_KEY = '@broto/care_tasks_cache';
const DEFAULT_REMINDER_HOUR = 9;

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
  last_completed_occurrence: string | null;
};

const CARE_TASK_SELECT =
  'id, plant_id, title, plant_name, plant_photo_url, category, notes, start_date, recurrence_days, reminder_hour, last_completed_occurrence';

export type CreateCareTaskInput = {
  title: string;
  plantId?: string | null;
  plantName?: string | null;
  plantPhotoUrl?: string | null;
  category: TaskCategory;
  notes?: string | null;
  recurrenceDays?: number | null;
  reminderHour?: number;
};

async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  return user?.id ?? null;
}

async function readCachedTasks(userId: string): Promise<CareTaskRow[]> {
  const raw = await AsyncStorage.getItem(`${CACHE_KEY}/${userId}`);
  return raw ? (JSON.parse(raw) as CareTaskRow[]) : [];
}

async function writeCachedTasks(userId: string, rows: CareTaskRow[]): Promise<void> {
  await AsyncStorage.setItem(`${CACHE_KEY}/${userId}`, JSON.stringify(rows));
}

async function migrateLegacyTasks(userId: string): Promise<void> {
  const migratedFlagKey = `${LEGACY_STORAGE_KEY}/${userId}/migrated`;
  if (await AsyncStorage.getItem(migratedFlagKey)) return;

  const raw = await AsyncStorage.getItem(`${LEGACY_STORAGE_KEY}/${userId}`);
  if (raw) {
    const legacyTasks = JSON.parse(raw) as {
      title: string;
      plantId: string | null;
      plantName: string | null;
      plantPhotoUrl: string | null;
      category: TaskCategory;
      notes: string | null;
      startDate: string;
      recurrenceDays: number | null;
      reminderHour?: number;
      lastCompletedOccurrence: string | null;
    }[];

    if (legacyTasks.length > 0) {
      await supabase.from('care_tasks').insert(
        legacyTasks.map((task) => ({
          user_id: userId,
          plant_id: task.plantId,
          title: task.title,
          plant_name: task.plantName,
          plant_photo_url: task.plantPhotoUrl,
          category: task.category,
          notes: task.notes,
          start_date: task.startDate,
          recurrence_days: task.recurrenceDays,
          reminder_hour: task.reminderHour ?? DEFAULT_REMINDER_HOUR,
          last_completed_occurrence: task.lastCompletedOccurrence,
        }))
      );
    }
  }

  await AsyncStorage.setItem(migratedFlagKey, '1');
}

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
    done: row.last_completed_occurrence === dueDate,
    lastCompletedOccurrence: row.last_completed_occurrence,
  };
}

export async function getCareTasks(): Promise<CareTask[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  await migrateLegacyTasks(userId);

  const todayDate = today();
  const { data, error } = await supabase.from('care_tasks').select(CARE_TASK_SELECT).eq('user_id', userId);

  if (error) {
    console.warn('Não foi possível buscar lembretes do Supabase, usando cache local:', error);
    const cached = await readCachedTasks(userId);
    return cached.map((row) => toCareTask(row, todayDate)).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }

  const rows = data as CareTaskRow[];
  await writeCachedTasks(userId, rows);

  return rows.map((row) => toCareTask(row, todayDate)).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export async function toggleCareTask(task: CareTask, done: boolean): Promise<void> {
  const { error } = await supabase
    .from('care_tasks')
    .update({ last_completed_occurrence: done ? task.dueDate : null })
    .eq('id', task.id);

  if (error) throw error;

  if (done) {
    await recordTaskCompletion(task);
  } else {
    await deleteMostRecentCompletion(task.id);
  }
}

export async function getCareTaskPlantId(id: string): Promise<string | null> {
  const { data } = await supabase.from('care_tasks').select('plant_id').eq('id', id).maybeSingle();
  return data?.plant_id ?? null;
}

export async function markCareTaskDoneById(id: string): Promise<void> {
  const { data: row, error } = await supabase.from('care_tasks').select(CARE_TASK_SELECT).eq('id', id).maybeSingle();
  if (error || !row) return;

  const taskRow = row as CareTaskRow;
  const dueDate = currentOccurrenceDate(taskRow, today());

  const { error: updateError } = await supabase
    .from('care_tasks')
    .update({ last_completed_occurrence: dueDate })
    .eq('id', id);
  if (updateError) return;

  await recordTaskCompletion(toCareTask(taskRow, today()));
}

const CARE_TASK_CATEGORY = 'care-task';
const MARK_DONE_ACTION = 'mark-done';
export const REMINDERS_CHANNEL_ID = 'reminders';

export async function registerCareTaskNotificationHandlers(): Promise<void> {
  const notifications = await getNotificationsModule();
  if (!notifications) return;

  notifications.setNotificationChannelAsync(REMINDERS_CHANNEL_ID, {
    name: 'Lembretes de cuidado',
    importance: notifications.AndroidImportance.HIGH,
  });

  notifications.setNotificationCategoryAsync(CARE_TASK_CATEGORY, [
    { identifier: MARK_DONE_ACTION, buttonTitle: 'Marcar como feito', options: { opensAppToForeground: false } },
  ]);

  notifications.addNotificationResponseReceivedListener(async (response) => {
    if (response.actionIdentifier !== MARK_DONE_ACTION) return;

    const data = response.notification.request.content.data as
      | { careTaskId?: string; careTaskIds?: string[] }
      | undefined;
    const careTaskId = data?.careTaskId ?? data?.careTaskIds?.[0];
    if (!careTaskId) return;

    await markCareTaskDoneById(careTaskId);
  });
}

export async function createCareTask(input: CreateCareTaskInput): Promise<CareTask> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Usuário não autenticado.');

  const startDate = today();
  const recurrenceDays = input.recurrenceDays ?? null;
  const reminderHour = input.reminderHour ?? DEFAULT_REMINDER_HOUR;

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
    })
    .select(CARE_TASK_SELECT)
    .single();

  if (error) throw error;

  return toCareTask(row as CareTaskRow, startDate);
}

export async function deleteCareTask(id: string): Promise<void> {
  const { error } = await supabase.from('care_tasks').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteCareTasksByPlantId(plantId: string): Promise<void> {
  await supabase.from('care_tasks').delete().eq('plant_id', plantId);
}
