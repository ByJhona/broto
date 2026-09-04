import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPlant, getPlants } from '@/services';
import type { Plant } from '@/types';
import { useAuth } from './useAuth';

type CreatePlantInput = {
  name: string;
  species?: string | null;
  commonName?: string | null;
  wateringDays?: number | null;
  photoUri?: string | null;
  photoUrl?: string | null;
  sunLevel?: Plant['sunLevel'];
  origin?: string | null;
};

export function usePlants() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['plants', user?.id] as const;

  const {
    data: plants = [],
    isLoading,
    isRefetching: isRefreshing,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: getPlants,
    enabled: !!user,
  });

  const { mutateAsync: addPlant } = useMutation({
    mutationFn: (input: CreatePlantInput) => createPlant(input),
    onSuccess: (plant) => {
      queryClient.setQueryData<Plant[]>(queryKey, (current = []) => [...current, plant]);
    },
  });

  return { plants, isLoading, isRefreshing, addPlant, refresh: refetch };
}
