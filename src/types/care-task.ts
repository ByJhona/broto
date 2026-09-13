export const TASK_CATEGORY = {
  WATERING: 'watering',
  MISTING: 'misting',
  SOIL_CHECK: 'soil_check',
  FERTILIZING: 'fertilizing',
  PRUNING: 'pruning',
  PURCHASE: 'purchase',
  GROWTH_CHECK: 'growth_check',
  OTHER: 'other',
} as const;

export type TaskCategory = (typeof TASK_CATEGORY)[keyof typeof TASK_CATEGORY];

export type CareTask = {
  id: string;
  title: string;
  plantId: string | null;
  plantName: string | null;
  plantPhotoUrl: string | null;
  category: TaskCategory;
  notes: string | null;
  dueDate: string;
  recurrenceDays: number | null;
  reminderHour: number;
  reminderMinute: number;
  done: boolean;
  lastCompletedOccurrence: string | null;
};
