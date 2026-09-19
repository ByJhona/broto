import { useEffect, useMemo } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import {
  getConversations,
  hasUnreadConversations,
  hideConversation,
  subscribeToOwnMessages,
  subscribeToOwnProposals,
  type ConversationsPage,
} from '@/services';
import { useAuth } from './useAuth';

function removeConversationFromPages(
  current: InfiniteData<ConversationsPage> | undefined,
  otherUserId: string
): InfiniteData<ConversationsPage> | undefined {
  if (!current) return current;
  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      conversations: page.conversations.filter((conversation) => conversation.otherUserId !== otherUserId),
    })),
  };
}

export function useConversations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const listKey = useMemo(() => ['conversations', user?.id, 'list'] as const, [user?.id]);
  const unreadKey = useMemo(() => ['conversations', user?.id, 'unread'] as const, [user?.id]);
  const invalidationKey = useMemo(() => ['conversations', user?.id] as const, [user?.id]);

  const {
    data: conversationsData,
    isLoading,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: listKey,
    queryFn: ({ pageParam }) => getConversations(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!user?.id,
  });

  const { data: hasUnread = false } = useQuery({
    queryKey: unreadKey,
    queryFn: hasUnreadConversations,
    enabled: !!user?.id,
  });

  const conversations = useMemo(
    () => conversationsData?.pages.flatMap((page) => page.conversations) ?? [],
    [conversationsData]
  );

  const { mutate: removeConversation } = useMutation({
    mutationFn: (otherUserId: string) => hideConversation(otherUserId),
    onMutate: async (otherUserId) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<InfiniteData<ConversationsPage>>(listKey);
      queryClient.setQueryData<InfiniteData<ConversationsPage>>(listKey, (current) =>
        removeConversationFromPages(current, otherUserId)
      );
      return { previous };
    },
    onError: (_error, _otherUserId, context) => {
      if (context?.previous) queryClient.setQueryData(listKey, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: unreadKey });
    },
  });

  useEffect(() => {
    if (!user?.id) return;

    const unsubscribeMessages = subscribeToOwnMessages(user.id, () => {
      queryClient.invalidateQueries({ queryKey: invalidationKey });
    });
    const unsubscribeProposals = subscribeToOwnProposals(user.id, () => {
      queryClient.invalidateQueries({ queryKey: invalidationKey });
    });

    return () => {
      unsubscribeMessages();
      unsubscribeProposals();
    };
  }, [user?.id, queryClient, invalidationKey]);

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  return {
    conversations,
    isLoading,
    hasUnread,
    refresh: refetch,
    removeConversation,
    hasMore: !!hasNextPage,
    isLoadingMore: isFetchingNextPage,
    loadMore,
  };
}
