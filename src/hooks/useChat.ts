import { useEffect, useMemo, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import {
  applyProposalStatusEverywhere,
  getChatMessages,
  getProposalsWithUser,
  markConversationRead,
  mergeProposal,
  patchListingInAllCaches,
  respondToProposal,
  sendChatMessage,
  subscribeToChatMessages,
  subscribeToProposalsWithUser,
  type ChatMessagesPage,
} from '@/services';
import { LISTING_STATUS, MESSAGE_DELIVERY, OFFER_STATUS, type ChatMessage, type MessageDelivery, type Proposal } from '@/types';
import { upsertInList } from '@/utils';
import { timelineItemCreatedAt, type ChatTimelineItem } from '@/utils/chatTimeline';
import { useAuth } from './useAuth';

export type { ChatTimelineItem } from '@/utils/chatTimeline';

type PendingMessage = { message: ChatMessage; delivery: MessageDelivery };

function itemId(item: ChatTimelineItem): string {
  return item.kind === 'message' ? item.message.id : item.proposal.id;
}

function itemIsMine(item: ChatTimelineItem, userId: string | undefined): boolean {
  if (!userId) return false;
  if (item.kind === 'message') return item.message.senderId === userId;
  if (item.proposal.respondedAt) return item.proposal.recipientId === userId;
  return item.proposal.senderId === userId;
}

function buildTimeline(messages: ChatMessage[], proposals: Proposal[], pending: PendingMessage[]): ChatTimelineItem[] {
  const items: ChatTimelineItem[] = [
    ...messages.map((message): ChatTimelineItem => ({ kind: 'message', message, delivery: null })),
    ...proposals.map((proposal): ChatTimelineItem => ({ kind: 'proposal', proposal })),
  ];
  const sentIds = new Set(messages.map((message) => message.id));
  const unsent = pending
    .filter((item) => !sentIds.has(item.message.id))
    .map((item): ChatTimelineItem => ({ kind: 'message', message: item.message, delivery: item.delivery }));
  return [...items.sort((a, b) => (timelineItemCreatedAt(a) < timelineItemCreatedAt(b) ? -1 : 1)), ...unsent];
}

function upsertMessageInPages(data: InfiniteData<ChatMessagesPage> | undefined, message: ChatMessage): InfiniteData<ChatMessagesPage> {
  if (!data || data.pages.length === 0) {
    return { pages: [{ messages: [message], nextCursor: null }], pageParams: [null] };
  }
  const [firstPage, ...restPages] = data.pages;
  return { ...data, pages: [{ ...firstPage, messages: upsertInList(firstPage.messages, message) }, ...restPages] };
}

export function useChat(otherUserId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const messagesKey = useMemo(() => ['chat-messages', otherUserId] as const, [otherUserId]);
  const proposalsKey = useMemo(() => ['chat-proposals', otherUserId] as const, [otherUserId]);

  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    isError: isMessagesError,
    refetch: refetchMessages,
    hasNextPage: hasMoreMessages,
    isFetchingNextPage: isLoadingMoreMessages,
    fetchNextPage: loadMoreMessages,
  } = useInfiniteQuery({
    queryKey: messagesKey,
    queryFn: ({ pageParam }) => getChatMessages(otherUserId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!otherUserId,
    staleTime: 0,
  });

  const messages = useMemo(
    () => [...(messagesData?.pages ?? [])].reverse().flatMap((page) => page.messages),
    [messagesData]
  );

  const {
    data: proposals = [],
    isLoading: isLoadingProposals,
    isError: isProposalsError,
    refetch: refetchProposals,
  } = useQuery({
    queryKey: proposalsKey,
    queryFn: () => getProposalsWithUser(otherUserId),
    enabled: !!otherUserId,
    staleTime: 0,
  });

  useEffect(() => {
    if (!otherUserId) return;

    const unsubscribe = subscribeToChatMessages(otherUserId, (message) => {
      queryClient.setQueryData<InfiniteData<ChatMessagesPage>>(messagesKey, (current) => upsertMessageInPages(current, message));
    });

    return unsubscribe;
  }, [otherUserId, queryClient, messagesKey]);

  useEffect(() => {
    if (!otherUserId) return;

    const unsubscribe = subscribeToProposalsWithUser(otherUserId, (proposal) => {
      queryClient.setQueryData<Proposal[]>(proposalsKey, (current = []) => upsertInList(current, proposal, { merge: mergeProposal }));
    });

    return unsubscribe;
  }, [otherUserId, queryClient, proposalsKey]);

  const timeline = useMemo(() => buildTimeline(messages, proposals, pendingMessages), [messages, proposals, pendingMessages]);

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

  const setDelivery = (id: string, delivery: MessageDelivery) =>
    setPendingMessages((current) => current.map((item) => (item.message.id === id ? { ...item, delivery } : item)));

  const discardMessage = (id: string) => setPendingMessages((current) => current.filter((item) => item.message.id !== id));

  const deliver = async (message: ChatMessage) => {
    setDelivery(message.id, MESSAGE_DELIVERY.SENDING);
    try {
      const sent = await sendChatMessage({ id: message.id, recipientId: otherUserId, body: message.body, photoUri: message.photoUrl });
      queryClient.setQueryData<InfiniteData<ChatMessagesPage>>(messagesKey, (current) => upsertMessageInPages(current, sent));
      discardMessage(message.id);
    } catch (err) {
      console.error(err);
      setDelivery(message.id, MESSAGE_DELIVERY.FAILED);
    }
  };

  const sendMessage = (input: { body: string | null; photoUri: string | null }) => {
    if (!user?.id) return;
    const message: ChatMessage = {
      id: randomUUID(),
      senderId: user.id,
      recipientId: otherUserId,
      body: input.body,
      photoUrl: input.photoUri,
      createdAt: new Date().toISOString(),
    };
    setPendingMessages((current) => [...current, { message, delivery: MESSAGE_DELIVERY.SENDING }]);
    deliver(message);
  };

  const retryMessage = (id: string) => {
    const pending = pendingMessages.find((item) => item.message.id === id);
    if (pending) deliver(pending.message);
  };

  const { mutateAsync: respondToProposalItem } = useMutation({
    mutationFn: ({ proposalId, accept, closeListing }: { proposalId: string; accept: boolean; closeListing: boolean }) =>
      respondToProposal(proposalId, accept, closeListing),
    onSuccess: (proposal, { closeListing }) => {
      applyProposalStatusEverywhere(queryClient, proposal, user?.id);
      if (proposal.status === OFFER_STATUS.ACCEPTED && closeListing) {
        patchListingInAllCaches(queryClient, proposal.listingId, (listing) => ({ ...listing, status: LISTING_STATUS.COMPLETED }));
      }
    },
  });

  const retry = () => {
    refetchMessages();
    refetchProposals();
  };

  return {
    timeline,
    isLoading: isLoadingMessages || isLoadingProposals,
    isError: isMessagesError || isProposalsError,
    retry,
    sendMessage,
    retryMessage,
    discardMessage,
    respondToProposal: respondToProposalItem,
    currentUserId: user?.id ?? null,
    hasMoreMessages: !!hasMoreMessages,
    isLoadingMoreMessages,
    loadMoreMessages,
  };
}
