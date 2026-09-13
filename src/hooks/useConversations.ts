import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getConversations, subscribeToOwnMessages } from '@/services';
import { useAuth } from './useAuth';

export function useConversations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['conversations', user?.id] as const, [user?.id]);

  const { data: conversations = [], isLoading, refetch } = useQuery({
    queryKey,
    queryFn: () => getConversations(user!.id),
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToOwnMessages(user.id, () => {
      queryClient.invalidateQueries({ queryKey });
    });

    return unsubscribe;
  }, [user?.id, queryClient, queryKey]);

  const hasUnread = conversations.some((conversation) => !conversation.lastMessageMine);

  return { conversations, isLoading, hasUnread, refresh: refetch };
}
