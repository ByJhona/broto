import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCareTask, deleteCareTask, getCareTasks, toggleCareTask, type CreateCareTaskInput } from '@/services';
import type { CareTask } from '@/types';
import { useAuth } from './useAuth';
import { celebrateXpLevelUp } from './useXp';

export function useCareTasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['care-tasks', user?.id] as const;

  const {
    data: tasks = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: getCareTasks,
    enabled: !!user,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ task, done }: { task: CareTask; done: boolean }) => toggleCareTask(task, done),
    onMutate: async ({ task, done }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<CareTask[]>(queryKey);
      queryClient.setQueryData<CareTask[]>(queryKey, (current = []) =>
        current.map((item) => (item.id === task.id ? { ...item, done } : item))
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSuccess: (_data, { done }) => {
      if (!done || !user?.id) return;
      queryClient.invalidateQueries({ queryKey: ['care-streak', user.id] });
      celebrateXpLevelUp(queryClient, user.id);
    },
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateCareTaskInput) => createCareTask(input),
    onSuccess: (task) => {
      queryClient.setQueryData<CareTask[]>(queryKey, (current = []) =>
        [...current, task].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCareTask(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<CareTask[]>(queryKey);
      queryClient.setQueryData<CareTask[]>(queryKey, (current = []) => current.filter((item) => item.id !== id));
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
  });

  const toggleTask = useCallback(
    (id: string) => {
      const task = tasks.find((item) => item.id === id);
      if (!task) return;
      if (!task.done) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toggleMutation.mutate({ task, done: !task.done });
    },
    [tasks, toggleMutation]
  );

  return {
    tasks,
    isLoading,
    toggleTask,
    createTask: createMutation.mutateAsync,
    deleteTask: deleteMutation.mutateAsync,
    refresh: refetch,
    pendingCount: tasks.filter((task) => !task.done).length,
  };
}
