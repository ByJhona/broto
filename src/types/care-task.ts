export type TaskCategory =
  | 'watering'
  | 'misting'
  | 'soil_check'
  | 'fertilizing'
  | 'pruning'
  | 'purchase'
  | 'growth_check'
  | 'other';

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
