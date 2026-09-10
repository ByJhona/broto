import { useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCareTask,
  deleteCareTask,
  getCareTasks,
  syncLocalReminders,
  toggleCareTask,
  type CreateCareTaskInput,
} from '@/services';
import type { CareTask } from '@/types';
import { useAuth } from './useAuth';

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

  useEffect(() => {
    syncLocalReminders(tasks);
  }, [tasks]);

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
