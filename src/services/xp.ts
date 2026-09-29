import { supabase } from './supabase';
import type { XpProgress } from '@/types';

const LEVEL_THRESHOLDS = [0, 50, 120, 220, 360, 550, 800, 1150, 1600, 2200, 3000];

export function computeXpProgress(totalXp: number): XpProgress {
  let level = 1;
  while (level < LEVEL_THRESHOLDS.length && totalXp >= LEVEL_THRESHOLDS[level]) {
    level += 1;
  }

  const currentThreshold = LEVEL_THRESHOLDS[level - 1];
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? null;

  return {
    level,
    totalXp,
    currentLevelXp: totalXp - currentThreshold,
    xpToNextLevel: nextThreshold === null ? null : nextThreshold - totalXp,
  };
}

export async function getXpProgress(userId: string): Promise<XpProgress> {
  const { data, error } = await supabase.rpc('get_xp_balance', { target_user_id: userId });

  if (error) {
    console.warn('Não foi possível buscar o XP do usuário:', error);
    return computeXpProgress(0);
  }

  return computeXpProgress(data ?? 0);
}
