import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';
import type { TaskCategory } from '@/types';

export type CareTaskCompletion = {
  id: string;
  taskId: string;
  taskTitle: string;
  category: TaskCategory;
  completedAt: string;
};

type CompletedTask = {
  id: string;
  title: string;
  category: TaskCategory;
  plantId: string | null;
};

type PendingCompletionOp = { type: 'record'; task: CompletedTask } | { type: 'delete'; taskId: string };

const PENDING_QUEUE_KEY = '@broto/pending_task_completions';

async function readQueue(): Promise<PendingCompletionOp[]> {
  const raw = await AsyncStorage.getItem(PENDING_QUEUE_KEY);
  return raw ? (JSON.parse(raw) as PendingCompletionOp[]) : [];
}

async function writeQueue(queue: PendingCompletionOp[]): Promise<void> {
  await AsyncStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(queue));
}

async function enqueue(op: PendingCompletionOp): Promise<void> {
  const queue = await readQueue();
  await writeQueue([...queue, op]);
}

async function performRecord(task: CompletedTask): Promise<boolean> {
  if (!task.plantId) return true;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return false;

  const { error } = await supabase.from('care_task_completions').insert({
    user_id: user.id,
    plant_id: task.plantId,
    task_id: task.id,
    task_title: task.title,
    category: task.category,
  });

  return !error;
}

async function performDeleteMostRecent(taskId: string): Promise<boolean> {
  const { data, error: selectError } = await supabase
    .from('care_task_completions')
    .select('id')
    .eq('task_id', taskId)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selectError) return false;
  if (!data) return true;

  const { error: deleteError } = await supabase.from('care_task_completions').delete().eq('id', data.id);
  return !deleteError;
}

export async function recordTaskCompletion(task: CompletedTask): Promise<void> {
  const succeeded = await performRecord(task);
  if (!succeeded) {
    await enqueue({ type: 'record', task });
  }
}

export async function deleteMostRecentCompletion(taskId: string): Promise<void> {
  const succeeded = await performDeleteMostRecent(taskId);
  if (!succeeded) {
    await enqueue({ type: 'delete', taskId });
  }
}

export async function flushPendingCompletions(): Promise<void> {
  const queue = await readQueue();
  if (queue.length === 0) return;

  const stillPending: PendingCompletionOp[] = [];

  for (const op of queue) {
    const succeeded = op.type === 'record' ? await performRecord(op.task) : await performDeleteMostRecent(op.taskId);

    if (!succeeded) {
      stillPending.push(op);
    }
  }

  await writeQueue(stillPending);
}

NetInfo.fetch().then((state) => {
  if (state.isConnected) flushPendingCompletions();
});

NetInfo.addEventListener((state) => {
  if (state.isConnected) flushPendingCompletions();
});

export async function getRecentCompletions(plantId: string, limit = 5): Promise<CareTaskCompletion[]> {
  const { data, error } = await supabase
    .from('care_task_completions')
    .select('*')
    .eq('plant_id', plantId)
    .order('completed_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return (
    data as { id: string; task_id: string; task_title: string; category: TaskCategory; completed_at: string }[]
  ).map((row) => ({
    id: row.id,
    taskId: row.task_id,
    taskTitle: row.task_title,
    category: row.category,
    completedAt: row.completed_at,
  }));
}
