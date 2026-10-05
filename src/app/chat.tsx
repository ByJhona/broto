import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, type ScrollViewProps } from 'react-native';
import { KeyboardChatScrollView } from 'react-native-keyboard-controller';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import ArrowDown from 'lucide-react-native/icons/arrow-down';
import RefreshCw from 'lucide-react-native/icons/refresh-cw';
import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { Avatar, EmptyState, FloatingPill, OutlineButton, PhotoViewerModal } from '@/components';
import { buildChatRows, type ChatRow } from '@/components/chat/chatRows';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChatDayDivider } from '@/components/chat/ChatDayDivider';
import { ChatIntro } from '@/components/chat/ChatIntro';
import { ChatSkeleton } from '@/components/chat/ChatSkeleton';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ProposalEventCard } from '@/components/chat/ProposalEventCard';
import { useChat } from '@/hooks';
import { getProfile, setActiveChatUser } from '@/services';
import { ActionSheet, confirmCloseListing, pickPhoto, Toast } from '@/utils';

function useNewMessagesIndicator(latestRow: ChatRow | undefined) {
  const latestKey = latestRow?.key ?? null;
  const latestIsMine = latestRow?.kind !== 'day' && !!latestRow?.isMine;
  const [isAtEnd, setIsAtEnd] = useState(true);
  const [seenKey, setSeenKey] = useState(latestKey);
  const [hasUnseen, setHasUnseen] = useState(false);

  if (latestKey !== seenKey) {
    setSeenKey(latestKey);
    if (!isAtEnd && !latestIsMine) setHasUnseen(true);
  }

  const handleEndVisible = useCallback((visible: boolean) => {
    setIsAtEnd(visible);
    if (visible) setHasUnseen(false);
  }, []);

  return { hasUnseen, handleEndVisible };
}

export default function ChatScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const listRef = useRef<FlatList<ChatRow>>(null);
  const { otherUserId } = useLocalSearchParams<{ otherUserId: string }>();
  const [draft, setDraft] = useState('');
  const [attachedPhotoUri, setAttachedPhotoUri] = useState<string | null>(null);
  const [viewerPhotoUrl, setViewerPhotoUrl] = useState<string | null>(null);
  const { t } = useTranslation(['chat', 'common']);
  const chat = useChat(otherUserId);
  const rows = useMemo(() => buildChatRows(chat.timeline, chat.currentUserId).reverse(), [chat.timeline, chat.currentUserId]);
  const newMessages = useNewMessagesIndicator(rows[0]);

  useFocusEffect(
    useCallback(() => {
      setActiveChatUser(otherUserId);
      return () => setActiveChatUser(null);
    }, [otherUserId])
  );

  const otherUserQuery = useQuery({
    queryKey: ['profile', otherUserId],
    queryFn: () => getProfile(otherUserId),
    enabled: !!otherUserId,
  });

  const otherUserName = otherUserQuery.data?.name || otherUserQuery.data?.username || t('defaultConversationName');
  const otherUserAvatarUrl = otherUserQuery.data?.avatar_url;

  const scrollToLatest = () => listRef.current?.scrollToOffset({ offset: 0, animated: true });

  const handlePressProfile = () => router.push({ pathname: '/profile/[id]', params: { id: otherUserId } });

  const handleOpenListing = (listingId: string) => router.push({ pathname: '/listing/[id]', params: { id: listingId } });

  const handleViewOffer = (proposalId: string) => router.push({ pathname: '/offer/[id]', params: { id: proposalId } });

  const handleSend = () => {
    const body = draft.trim();
    if (!body && !attachedPhotoUri) return;
    chat.sendMessage({ body: body || null, photoUri: attachedPhotoUri });
    setDraft('');
    setAttachedPhotoUri(null);
    scrollToLatest();
  };

  const handlePickPhoto = async () => {
    const photoUri = await pickPhoto(t('sendPhotoAction'));
    if (photoUri) setAttachedPhotoUri(photoUri);
  };

  const handlePressFailed = (messageId: string) => {
    ActionSheet.show(t('failedMessageTitle'), [
      { text: t('retrySendAction'), onPress: () => chat.retryMessage(messageId) },
      { text: t('discardMessageAction'), style: 'destructive', onPress: () => chat.discardMessage(messageId) },
      { text: t('common:cancel'), style: 'cancel' },
    ]);
  };

  const handleRespond = async (proposalId: string, accept: boolean) => {
    try {
      const closeListing = accept ? await confirmCloseListing() : false;
      if (closeListing === null) return;
      await chat.respondToProposal({ proposalId, accept, closeListing });
    } catch (err) {
      console.error(err);
      Toast.error(t('respondOfferError'));
    }
  };

  const handleLoadOlder = () => {
    if (chat.hasMoreMessages && !chat.isLoadingMoreMessages) chat.loadMoreMessages();
  };

  const renderScrollComponent = useCallback(
    (props: ScrollViewProps) => (
      <KeyboardChatScrollView
        {...props}
        inverted
        keyboardLiftBehavior="always"
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        onEndVisible={newMessages.handleEndVisible}
      />
    ),
    [newMessages.handleEndVisible]
  );

  const renderRow = ({ item }: { item: ChatRow }) => {
    if (item.kind === 'day') return <ChatDayDivider date={item.date} />;
    if (item.kind === 'proposal') {
      return (
        <ProposalEventCard
          proposal={item.proposal}
          isMine={item.isMine}
          onRespond={handleRespond}
          onViewOffer={handleViewOffer}
          onOpenListing={handleOpenListing}
        />
      );
    }
    return (
      <MessageBubble
        message={item.message}
        delivery={item.delivery}
        isMine={item.isMine}
        startsGroup={item.startsGroup}
        endsGroup={item.endsGroup}
        onPressPhoto={setViewerPhotoUrl}
        onPressFailed={handlePressFailed}
      />
    );
  };

  const renderBody = () => {
    if (chat.isLoading) return <ChatSkeleton />;
    if (chat.isError) {
      return (
        <View style={styles.error}>
          <EmptyState icon={TriangleAlert} message={t('loadError')} />
          <OutlineButton label={t('retryButton')} icon={RefreshCw} onPress={chat.retry} />
        </View>
      );
    }
    if (rows.length === 0) {
      return <ChatIntro name={otherUserName} avatarUrl={otherUserAvatarUrl} onPressProfile={handlePressProfile} />;
    }
    return (
      <>
        <FlatList
          ref={listRef}
          inverted
          data={rows}
          keyExtractor={(row) => row.key}
          renderItem={renderRow}
          renderScrollComponent={renderScrollComponent}
          contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="handled"
          maintainVisibleContentPosition={{ minIndexForVisible: 0, autoscrollToTopThreshold: Metrics.size.hero }}
          onEndReached={handleLoadOlder}
          onEndReachedThreshold={0.5}
          ListFooterComponent={chat.isLoadingMoreMessages ? <ActivityIndicator style={styles.loadingOlder} color={colors.leaf} /> : null}
        />
        {newMessages.hasUnseen ? (
          <FloatingPill label={t('newMessages')} icon={ArrowDown} onPress={scrollToLatest} style={styles.newMessages} />
        ) : null}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <Pressable style={styles.headerTitle} onPress={handlePressProfile} accessibilityRole="button">
              <Avatar name={otherUserName} url={otherUserAvatarUrl} size={Metrics.size.sm} />
              <Text style={styles.headerTitleText} numberOfLines={1}>
                {otherUserName}
              </Text>
            </Pressable>
          ),
        }}
      />

      <View style={styles.body}>{renderBody()}</View>

      <ChatComposer
        draft={draft}
        onChangeDraft={setDraft}
        attachedPhotoUri={attachedPhotoUri}
        onPickPhoto={handlePickPhoto}
        onRemovePhoto={() => setAttachedPhotoUri(null)}
        onSend={handleSend}
      />
      <PhotoViewerModal photoUrl={viewerPhotoUrl} onClose={() => setViewerPhotoUrl(null)} />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerTitle: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
      gap: Metrics.spacing.sm,
    },
    headerTitleText: {
      ...Typography.heading,
      color: colors.foreground,
      flexShrink: 1,
    },
    body: {
      flex: 1,
    },
    error: {
      ...Metrics.layout.centeredContent,
      flex: 1,
      justifyContent: 'center',
      gap: Metrics.spacing.md,
      padding: Metrics.spacing.xl,
    },
    messages: {
      ...Metrics.layout.centeredContent,
      paddingHorizontal: Metrics.spacing.lg,
      paddingVertical: Metrics.spacing.md,
    },
    loadingOlder: {
      paddingVertical: Metrics.spacing.lg,
    },
    newMessages: {
      top: Metrics.spacing.sm,
    },
  });
