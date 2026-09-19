import { useQuery } from '@tanstack/react-query';
import { getRecentlyCatalogedSpecies } from '@/services';
import { useAuth } from './useAuth';

export function useRecentlyCatalogedSpecies() {
  const { user } = useAuth();

  const { data: species = [], isLoading } = useQuery({
    queryKey: ['recentlyCatalogedSpecies'],
    queryFn: getRecentlyCatalogedSpecies,
    enabled: !!user,
  });

  return { species, isLoading };
}
