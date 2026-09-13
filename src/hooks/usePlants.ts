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
      const summary: PlantSummary = {
        id: plant.id,
        createdAt: plant.createdAt,
        name: plant.name,
        species: plant.species,
        commonName: plant.commonName,
        photoUrl: plant.photoUrls[0] ?? null,
        wateringDays: plant.wateringDays,
        sunLevel: plant.sunLevel,
      };
      queryClient.setQueryData<PlantSummary[]>(queryKey, (current = []) => [...current, summary]);
    },
  });

  return { plants, isLoading, addPlant, refresh: refetch };
}
