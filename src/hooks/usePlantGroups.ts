import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPlantGroup, deletePlantGroup, getPlantGroups, renamePlantGroup } from '@/services';
import type { PlantGroup } from '@/types';
import { useAuth } from './useAuth';

export function usePlantGroups() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['plant-groups', user?.id] as const;

  const {
    data: groups = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: getPlantGroups,
    enabled: !!user,
  });

  const { mutateAsync: addGroup } = useMutation({
    mutationFn: (name: string) => createPlantGroup(name),
    onSuccess: (group) => {
      queryClient.setQueryData<PlantGroup[]>(queryKey, (current = []) => [...current, group]);
    },
  });

  const { mutateAsync: renameGroup } = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renamePlantGroup(id, name),
    onSuccess: (_data, { id, name }) => {
      queryClient.setQueryData<PlantGroup[]>(queryKey, (current = []) =>
        current.map((group) => (group.id === id ? { ...group, name } : group))
      );
      queryClient.invalidateQueries({ queryKey: ['plant'] });
    },
  });

  const { mutateAsync: removeGroup } = useMutation({
    mutationFn: (id: string) => deletePlantGroup(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<PlantGroup[]>(queryKey, (current = []) => current.filter((group) => group.id !== id));
      queryClient.invalidateQueries({ queryKey: ['plants'] });
    },
  });

  return { groups, isLoading, refresh: refetch, addGroup, renameGroup, removeGroup };
}
