import { useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteAllNotifications, deleteNotification, getNotifications } from '@/services';
import type { Notification } from '@/types';
import { useAuth } from './useAuth';

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['notifications', user?.id] as const;

  const { data: notifications = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => getNotifications(user!.id),
    enabled: !!user,
  });

  const deleteOne = async (id: string) => {
    await deleteNotification(id);
    queryClient.setQueryData<Notification[]>(queryKey, (current = []) => current.filter((item) => item.id !== id));
  };

  const clearAll = async () => {
    if (!user) return;
    await deleteAllNotifications(user.id);
    queryClient.setQueryData<Notification[]>(queryKey, []);
  };

  return {
    notifications,
    isLoading,
    hasUnread: notifications.some((notification) => !notification.read),
    deleteOne,
    clearAll,
  };
}
