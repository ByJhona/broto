import { useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getChatMessages, respondToOffer, sendChatMessage, subscribeToChatMessages } from '@/services';
import type { ChatMessage } from '@/types';
import { useAuth } from './useAuth';

function upsertMessage(current: ChatMessage[], message: ChatMessage): ChatMessage[] {
  const index = current.findIndex((item) => item.id === message.id);
  if (index === -1) return [...current, message];
  const next = [...current];
  next[index] = message;
  return next;
}

export function useChat(otherUserId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['chat-messages', otherUserId] as const, [otherUserId]);

  const { data: messages = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => getChatMessages(otherUserId),
    enabled: !!otherUserId,
  });

  useEffect(() => {
    if (!otherUserId) return;

    const unsubscribe = subscribeToChatMessages(otherUserId, (message) => {
      queryClient.setQueryData<ChatMessage[]>(queryKey, (current = []) => upsertMessage(current, message));
    });

    return unsubscribe;
  }, [otherUserId, queryClient, queryKey]);

  const { mutateAsync: sendMessage, isPending: isSending } = useMutation({
    mutationFn: (body: string) => sendChatMessage({ recipientId: otherUserId, body }),
    onSuccess: (message) => {
      queryClient.setQueryData<ChatMessage[]>(queryKey, (current = []) =>
        current.some((item) => item.id === message.id) ? current : [...current, message]
      );
    },
  });

  const { mutateAsync: respondToOfferMessage } = useMutation({
    mutationFn: ({ messageId, accept }: { messageId: string; accept: boolean }) => respondToOffer(messageId, accept),
    onSuccess: (message) => {
      queryClient.setQueryData<ChatMessage[]>(queryKey, (current = []) =>
        current.map((item) => (item.id === message.id ? message : item))
      );
      if (message.offerStatus === 'accepted' && message.listingId) {
        queryClient.invalidateQueries({ queryKey: ['plant-listings'] });
        queryClient.invalidateQueries({ queryKey: ['plant-listing', message.listingId] });
      }
    },
  });

  return {
    messages,
    isLoading,
    sendMessage,
    isSending,
    respondToOfferMessage,
    currentUserId: user?.id ?? null,
  };
}
