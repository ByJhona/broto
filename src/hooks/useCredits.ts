import { useQuery, useQueryClient } from '@tanstack/react-query';
import { canAfford, getCredits, type CreditsState } from '@/services';
import { useAuth } from './useAuth';

function creditsQueryKey(userId: string | undefined) {
  return ['credits', userId] as const;
}

function applyCreditBalanceTo(
  queryClient: ReturnType<typeof useQueryClient>,
  queryKey: ReturnType<typeof creditsQueryKey>,
  balance: number | null
) {
  if (balance == null) return;
  queryClient.setQueryData<CreditsState | null>(queryKey, (current) => (current ? { ...current, balance } : current));
}

export function useCredits() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = creditsQueryKey(session?.user.id);

  const { data: credits = null, refetch } = useQuery({
    queryKey,
    queryFn: getCredits,
    enabled: !!session,
  });

  const applyCreditBalance = (balance: number | null) => applyCreditBalanceTo(queryClient, queryKey, balance);

  return { credits, refresh: refetch, applyCreditBalance };
}

export function useCreditsGate() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = creditsQueryKey(session?.user.id);

  const canAffordCost = (cost: number) => canAfford(queryClient.getQueryData<CreditsState | null>(queryKey) ?? null, cost);

  const applyCreditBalance = (balance: number | null) => applyCreditBalanceTo(queryClient, queryKey, balance);

  return { canAffordCost, applyCreditBalance };
}
