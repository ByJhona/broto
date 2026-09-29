import type { CareTask, TaskCategory } from '@/types';
import { addDays, daysBetween } from '@/utils';

export type PlantCareStatus = {
  category: TaskCategory;
  daysUntil: number;
};

type Translate = (key: string, options?: Record<string, unknown>) => string;

function nextOccurrence(task: CareTask): string | null {
  if (!task.done) return task.dueDate;
  return task.recurrenceDays ? addDays(task.dueDate, task.recurrenceDays) : null;
}

function isEarlier(candidate: PlantCareStatus, current: PlantCareStatus | undefined): boolean {
  return !current || candidate.daysUntil < current.daysUntil;
}

export function nextCareByPlant(tasks: CareTask[], todayDate: string): Map<string, PlantCareStatus> {
  const byPlant = new Map<string, PlantCareStatus>();

  for (const task of tasks) {
    const date = nextOccurrence(task);
    if (!task.plantId || !date) continue;

    const candidate = { category: task.category, daysUntil: daysBetween(todayDate, date) };
    if (isEarlier(candidate, byPlant.get(task.plantId))) byPlant.set(task.plantId, candidate);
  }

  return byPlant;
}

function isDueNow(task: CareTask, todayDate: string, keptIds: ReadonlySet<string>): boolean {
  if (task.dueDate > todayDate) return false;
  return !task.done || task.dueDate === todayDate || keptIds.has(task.id);
}

export function tasksForToday(tasks: CareTask[], todayDate: string, keptIds: ReadonlySet<string>): CareTask[] {
  return tasks
    .filter((task) => isDueNow(task, todayDate, keptIds))
    .sort((a, b) => Number(a.done) - Number(b.done));
}

export function plantCareLabel(care: PlantCareStatus | null, t: Translate): string {
  if (!care) return t('plantCareNone');
  if (care.daysUntil < -1) return t('taskOverdueDays', { days: -care.daysUntil });
  if (care.daysUntil === -1) return t('taskOverdueOneDay');
  if (care.daysUntil === 0) return t('plantCareToday');
  if (care.daysUntil === 1) return t('plantCareTomorrow');
  return t('plantCareInDays', { days: care.daysUntil });
}
