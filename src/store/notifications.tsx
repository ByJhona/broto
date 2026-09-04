import { useEffect, type PropsWithChildren } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getNotificationById, supabase } from '@/services';
import { useAuthContext } from './auth';
import type { Notification } from '@/types';

let channelInstanceCounter = 0;

export function NotificationsProvider({ children }: PropsWithChildren) {
  const { session } = useAuthContext();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const instanceId = ++channelInstanceCounter;
    const queryKey = ['notifications', userId] as const;

    const channel = supabase
      .channel(`notifications:${userId}:${instanceId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        async (payload) => {
          const newNotif = await getNotificationById(payload.new.id);
          if (!newNotif) return;
          queryClient.setQueryData<Notification[]>(queryKey, (current = []) => [newNotif, ...current]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return <>{children}</>;
}
