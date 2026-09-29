import { daysBetween, today } from '@/utils/date';
import { getCurrentUserId, supabase } from './supabase';
import type { CareStreak } from '@/types';

function consecutiveRunLengths(sortedDates: string[]): number[] {
  const runs = [1];
  for (let i = 1; i < sortedDates.length; i++) {
    const continuesRun = daysBetween(sortedDates[i - 1], sortedDates[i]) === 1;
    if (continuesRun) {
      runs[runs.length - 1] += 1;
    } else {
      runs.push(1);
    }
  }
  return runs;
}

export function computeCareStreak(completedDates: string[], todayDate: string): CareStreak {
  const sortedDates = Array.from(new Set(completedDates)).sort();
  if (sortedDates.length === 0) return { current: 0, longest: 0 };

  const runs = consecutiveRunLengths(sortedDates);
  const longest = Math.max(...runs);

  const lastDate = sortedDates[sortedDates.length - 1];
  const isActive = daysBetween(lastDate, todayDate) <= 1;
  const current = isActive ? runs[runs.length - 1] : 0;

  return { current, longest };
}

export async function getCareStreak(): Promise<CareStreak> {
  const userId = await getCurrentUserId();
  if (!userId) return { current: 0, longest: 0 };

  const { data, error } = await supabase
    .from('care_task_completions')
    .select('completed_date')
    .eq('user_id', userId)
    .order('completed_date', { ascending: false })
    .limit(400);

  if (error) {
    console.warn('Não foi possível buscar o streak de cuidado:', error);
    return { current: 0, longest: 0 };
  }

  const completedDates = (data as { completed_date: string }[]).map((row) => row.completed_date);
  return computeCareStreak(completedDates, today());
}

export async function recordCareTaskCompletion(): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const { error } = await supabase
    .from('care_task_completions')
    .upsert({ user_id: userId, completed_date: today() }, { onConflict: 'user_id,completed_date', ignoreDuplicates: true });

  if (error) console.warn('Não foi possível registrar o streak de cuidado:', error);
}
