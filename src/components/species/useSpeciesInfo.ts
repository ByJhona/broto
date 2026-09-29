import { useQuery } from '@tanstack/react-query';
import { getPlantSpeciesInfo, plantSpeciesInfoQueryKey } from '@/services';

const SPECIES_STALE_TIME = 24 * 60 * 60 * 1000;

export function useSpeciesInfo(scientificName: string | null, commonName: string | null) {
  return useQuery({
    queryKey: plantSpeciesInfoQueryKey(scientificName ?? ''),
    queryFn: () => getPlantSpeciesInfo(scientificName!, commonName),
    enabled: !!scientificName,
    staleTime: SPECIES_STALE_TIME,
    retry: 1,
  });
}

export type SpeciesInfoQuery = ReturnType<typeof useSpeciesInfo>;
