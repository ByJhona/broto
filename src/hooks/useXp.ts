import { useQuery, type QueryClient } from '@tanstack/react-query';
import { computeXpProgress, getXpProgress } from '@/services';
import type { XpProgress } from '@/types';
import { LevelUp } from '@/utils';

const ZERO_XP_PROGRESS = computeXpProgress(0);

export function useXp(userId: string | null | undefined) {
  const { data } = useQuery({
    queryKey: ['xp', userId],
    queryFn: () => getXpProgress(userId!),
    enabled: !!userId,
  });

  return data ?? ZERO_XP_PROGRESS;
}

export async function celebrateXpLevelUp(queryClient: QueryClient, userId: string): Promise<void> {
  const previous = queryClient.getQueryData<XpProgress>(['xp', userId]);
  const next = await getXpProgress(userId);
  queryClient.setQueryData(['xp', userId], next);

  if (previous && next.level > previous.level) {
    LevelUp.show(next.level);
  }
}
