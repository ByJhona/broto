import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteAllNotifications, deleteNotification, getNotifications } from '@/services';
import type { Notification } from '@/types';
import { useAuth } from './useAuth';

export function useNotifications() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const queryKey = ['notifications', userId] as const;

  const { data: notifications = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => getNotifications(userId!),
    enabled: !!userId,
  });

  const deleteOneMutation = useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Notification[]>(queryKey);
      queryClient.setQueryData<Notification[]>(queryKey, (current = []) => current.filter((item) => item.id !== id));
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      if (userId) await deleteAllNotifications(userId);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Notification[]>(queryKey);
      queryClient.setQueryData<Notification[]>(queryKey, []);
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
  });

  return {
    notifications,
    isLoading,
    hasUnread: notifications.length > 0,
    deleteOne: (id: string) => deleteOneMutation.mutate(id),
    clearAll: () => clearAllMutation.mutate(),
  };
}
