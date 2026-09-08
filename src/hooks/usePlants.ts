import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPlant, getPlants, type CreatePlantInput } from '@/services';
import type { PlantSummary } from '@/types';
import { useAuth } from './useAuth';

export function usePlants() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['plants', user?.id] as const;

  const {
    data: plants = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: getPlants,
    enabled: !!user,
  });

  const { mutateAsync: addPlant } = useMutation({
    mutationFn: (input: CreatePlantInput) => createPlant(input),
    onSuccess: (plant) => {
      queryClient.setQueryData<PlantSummary[]>(queryKey, (current = []) => [...current, plant]);
    },
  });

  return { plants, isLoading, addPlant, refresh: refetch };
}
