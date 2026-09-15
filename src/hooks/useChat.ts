import { useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getChatMessages,
  getProposalsWithUser,
  markConversationRead,
  respondToProposal,
  sendChatMessage,
  subscribeToChatMessages,
  subscribeToProposalsWithUser,
} from '@/services';
import { OFFER_STATUS, type ChatMessage, type Proposal } from '@/types';
import { useAuth } from './useAuth';

export type ChatTimelineItem = { kind: 'message'; message: ChatMessage } | { kind: 'proposal'; proposal: Proposal };

function itemId(item: ChatTimelineItem): string {
  return item.kind === 'message' ? item.message.id : item.proposal.id;
}

function itemCreatedAt(item: ChatTimelineItem): string {
  return item.kind === 'message' ? item.message.createdAt : (item.proposal.respondedAt ?? item.proposal.createdAt);
}

function itemIsMine(item: ChatTimelineItem, userId: string | undefined): boolean {
  if (!userId) return false;
  if (item.kind === 'message') return item.message.senderId === userId;
  if (item.proposal.respondedAt) return item.proposal.recipientId === userId;
  return item.proposal.senderId === userId;
}

function buildTimeline(messages: ChatMessage[], proposals: Proposal[]): ChatTimelineItem[] {
  const items: ChatTimelineItem[] = [
    ...messages.map((message): ChatTimelineItem => ({ kind: 'message', message })),
    ...proposals.map((proposal): ChatTimelineItem => ({ kind: 'proposal', proposal })),
  ];
  return items.sort((a, b) => (itemCreatedAt(a) < itemCreatedAt(b) ? -1 : 1));
}

function upsertById<T extends { id: string }>(current: T[], item: T): T[] {
  const index = current.findIndex((existing) => existing.id === item.id);
  if (index === -1) return [...current, item];
  const next = [...current];
  next[index] = item;
  return next;
}

export function useChat(otherUserId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const messagesKey = useMemo(() => ['chat-messages', otherUserId] as const, [otherUserId]);
  const proposalsKey = useMemo(() => ['chat-proposals', otherUserId] as const, [otherUserId]);

  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: messagesKey,
    queryFn: () => getChatMessages(otherUserId),
    enabled: !!otherUserId,
  });

  const { data: proposals = [], isLoading: isLoadingProposals } = useQuery({
    queryKey: proposalsKey,
    queryFn: () => getProposalsWithUser(otherUserId),
    enabled: !!otherUserId,
  });

  useEffect(() => {
    if (!otherUserId) return;

    const unsubscribe = subscribeToChatMessages(otherUserId, (message) => {
      queryClient.setQueryData<ChatMessage[]>(messagesKey, (current = []) => upsertById(current, message));
    });

    return unsubscribe;
  }, [otherUserId, queryClient, messagesKey]);

  useEffect(() => {
    if (!otherUserId) return;

    const unsubscribe = subscribeToProposalsWithUser(otherUserId, (proposal) => {
      queryClient.setQueryData<Proposal[]>(proposalsKey, (current = []) => upsertById(current, proposal));
    });

    return unsubscribe;
  }, [otherUserId, queryClient, proposalsKey]);

  const timeline = useMemo(() => buildTimeline(messages, proposals), [messages, proposals]);

  const { mutate: markRead } = useMutation({
    mutationFn: () => markConversationRead(otherUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', user!.id] });
    },
  });

  const lastItem = timeline.length > 0 ? timeline[timeline.length - 1] : null;
  const lastItemId = lastItem ? itemId(lastItem) : null;
  const lastItemIsMine = !!lastItem && itemIsMine(lastItem, user?.id);

  useEffect(() => {
    if (!user?.id || !otherUserId || !lastItemId || lastItemIsMine) return;
    markRead();
  }, [user?.id, otherUserId, lastItemId, lastItemIsMine, markRead]);

  const { mutateAsync: sendMessage, isPending: isSending } = useMutation({
    mutationFn: (body: string) => sendChatMessage({ recipientId: otherUserId, body }),
    onSuccess: (message) => {
      queryClient.setQueryData<ChatMessage[]>(messagesKey, (current = []) => upsertById(current, message));
    },
  });

  const { mutateAsync: respondToProposalItem } = useMutation({
    mutationFn: ({ proposalId, accept }: { proposalId: string; accept: boolean }) => respondToProposal(proposalId, accept),
    onSuccess: (proposal) => {
      queryClient.setQueryData<Proposal[]>(proposalsKey, (current = []) => upsertById(current, proposal));
      if (proposal.status === OFFER_STATUS.ACCEPTED) {
        queryClient.invalidateQueries({ queryKey: ['plant-listings'] });
        queryClient.invalidateQueries({ queryKey: ['plant-listing', proposal.listingId] });
      }
    },
  });

  return {
    timeline,
    isLoading: isLoadingMessages || isLoadingProposals,
    sendMessage,
    isSending,
    respondToProposal: respondToProposalItem,
    currentUserId: user?.id ?? null,
  };
}
