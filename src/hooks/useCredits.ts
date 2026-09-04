import { useQuery } from '@tanstack/react-query';
import { getCredits } from '@/services';
import { useAuth } from './useAuth';

export function useCredits() {
  const { session } = useAuth();
  const queryKey = ['credits', session?.user.id] as const;

  const { data: credits = null, refetch } = useQuery({
    queryKey,
    queryFn: getCredits,
    enabled: !!session,
  });

  return { credits, refresh: refetch };
}
