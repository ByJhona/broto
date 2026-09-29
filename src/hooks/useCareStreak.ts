import { useQuery } from '@tanstack/react-query';
import { getCareStreak } from '@/services';
import { useAuth } from './useAuth';

export function useCareStreak() {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ['care-streak', user?.id],
    queryFn: getCareStreak,
    enabled: !!user,
  });

  return {
    current: data?.current ?? 0,
    longest: data?.longest ?? 0,
    isLoaded: data !== undefined,
  };
}
