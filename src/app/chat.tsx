import { useMemo, useRef, useState, type ElementRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardChatScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Leaf from 'lucide-react-native/icons/leaf';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import Send from 'lucide-react-native/icons/send';
import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { useTranslation } from '@/i18n';
import { Avatar, Card, EmptyState, IconButton, LoadingScreen } from '@/components';
import { useChat, type ChatTimelineItem } from '@/hooks';
import { getProfile } from '@/services';
import { Toast } from '@/utils';
import { OFFER_STATUS, type OfferStatus, type Proposal } from '@/types';

function getOfferStatusLabel(t: (key: string) => string): Record<OfferStatus, string> {
  return {
    [OFFER_STATUS.PENDING]: t('offerStatusPending'),
    [OFFER_STATUS.ACCEPTED]: t('offerStatusAccepted'),
    [OFFER_STATUS.DECLINED]: t('offerStatusDeclined'),
  };
}

export default function ChatScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const scrollRef = useRef<ElementRef<typeof KeyboardChatScrollView>>(null);
  const [inputHeight, setInputHeight] = useState(0);
  const { otherUserId } = useLocalSearchParams<{ otherUserId: string }>();
  const [draft, setDraft] = useState('');
  const { t } = useTranslation('chat');
  const offerStatusLabel = getOfferStatusLabel(t);

  const handleInputLayout = (event: LayoutChangeEvent) => {
    setInputHeight(event.nativeEvent.layout.height);
  };

  const {
    timeline,
    isLoading,
    isError,
    retry,
    sendMessage,
    isSending,
    respondToProposal,
    currentUserId,
    hasMoreMessages,
    isLoadingMoreMessages,
    loadMoreMessages,
  } = useChat(otherUserId);

  const previousContentHeightRef = useRef(0);
  const isLoadingOlderRef = useRef(false);

  const handleContentSizeChange = (_width: number, height: number) => {
    if (isLoadingOlderRef.current) {
      const delta = height - previousContentHeightRef.current;
      if (delta > 0) scrollRef.current?.scrollTo({ y: delta, animated: false });
      isLoadingOlderRef.current = false;
    } else {
      scrollRef.current?.scrollToEnd({ animated: true });
    }
    previousContentHeightRef.current = height;
  };

  const handleLoadMoreMessages = () => {
    isLoadingOlderRef.current = true;
    loadMoreMessages();
  };

  const otherUserQuery = useQuery({
    queryKey: ['profile', otherUserId],
    queryFn: () => getProfile(otherUserId),
    enabled: !!otherUserId,
  });

  const otherUserName = otherUserQuery.data?.name || otherUserQuery.data?.username || t('defaultConversationName');

  const handlePressProfile = () => {
    router.push({ pathname: '/profile/[id]', params: { id: otherUserId } });
  };

  const handleSend = async () => {
    const body = draft.trim();
    if (!body) return;

    setDraft('');
    try {
      await sendMessage(body);
    } catch (err) {
      setDraft(body);
      Toast.error(err instanceof Error ? err.message : t('sendMessageError'));
    }
  };

  const handleRespond = async (proposalId: string, accept: boolean) => {
    try {
      await respondToProposal({ proposalId, accept });
    } catch (err) {
      Toast.error(err instanceof Error ? err.message : t('respondOfferError'));
    }
  };

  const renderProposalCard = (proposal: Proposal, isMine: boolean) => (
    <Card style={styles.offerCard}>
      <View style={styles.offerHeader}>
        {proposal.offeredPlantPhotoUrl ? (
          <Image source={{ uri: proposal.offeredPlantPhotoUrl }} style={styles.offerPlantImage} />
        ) : (
          <View style={[styles.offerPlantImage, styles.offerPlantImagePlaceholder]}>
            <Leaf size={20} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
          </View>
        )}
        <View style={styles.offerHeaderText}>
          <Text style={styles.offerTitle}>{proposal.proposalType === 'interest' ? t('interestCardTitle') : t('offerCardTitle')}</Text>
          <Text style={styles.offerSubtitle}>
            {proposal.proposalType === 'interest'
              ? proposal.listingTitle
              : t('offerCardSubtitle', { plantName: proposal.offeredPlantName, listingTitle: proposal.listingTitle })}
          </Text>
        </View>
      </View>

      {!isMine && proposal.status === OFFER_STATUS.PENDING ? (
        <View style={styles.offerActions}>
          <Pressable style={styles.offerDecline} onPress={() => handleRespond(proposal.id, false)}>
            <Text style={styles.offerDeclineText}>{t('declineButton')}</Text>
          </Pressable>
          <Pressable style={styles.offerAccept} onPress={() => handleRespond(proposal.id, true)}>
            <Text style={styles.offerAcceptText}>{t('acceptButton')}</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.offerStatus}>{offerStatusLabel[proposal.status]}</Text>
      )}
    </Card>
  );

  const renderErrorState = () => (
    <View style={styles.emptyContainer}>
      <EmptyState icon={TriangleAlert} message={t('loadError')} />
      <Pressable style={styles.retryButton} onPress={retry}>
        <Text style={styles.retryButtonText}>{t('retryButton')}</Text>
      </Pressable>
    </View>
  );

  const renderTimelineItem = (item: ChatTimelineItem, isMine: boolean) => {
    if (item.kind === 'proposal') {
      return renderProposalCard(item.proposal, isMine);
    }
    return (
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{item.message.body}</Text>
      </View>
    );
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <Pressable style={styles.headerTitle} onPress={handlePressProfile}>
              <Avatar name={otherUserName} url={otherUserQuery.data?.avatar_url} size={32} />
              <Text style={styles.headerTitleText} numberOfLines={1}>
                {otherUserName}
              </Text>
            </Pressable>
          ),
        }}
      />

      {isError && renderErrorState()}
      {!isError && timeline.length === 0 && (
        <EmptyState icon={MessageCircle} message={t('emptyMessage')} style={styles.emptyContainer} />
      )}
      {!isError && timeline.length > 0 && (
        <KeyboardChatScrollView
          ref={scrollRef}
          offset={inputHeight}
          style={styles.messagesScroll}
          contentContainerStyle={styles.messages}
          onContentSizeChange={handleContentSizeChange}
        >
          {hasMoreMessages && (
            <Pressable style={styles.loadMoreButton} onPress={handleLoadMoreMessages} disabled={isLoadingMoreMessages}>
              <Text style={styles.loadMoreButtonText}>
                {isLoadingMoreMessages ? t('loadingEarlierMessages') : t('loadEarlierMessagesAction')}
              </Text>
            </Pressable>
          )}
          {timeline.map((item) => {
            const senderId = item.kind === 'message' ? item.message.senderId : item.proposal.senderId;
            const key = item.kind === 'message' ? item.message.id : item.proposal.id;
            const isMine = senderId === currentUserId;
            return (
              <View key={key} style={[styles.messageRow, isMine && styles.messageRowMine]}>
                {renderTimelineItem(item, isMine)}
              </View>
            );
          })}
        </KeyboardChatScrollView>
      )}

      <KeyboardStickyView
        onLayout={handleInputLayout}
        style={[styles.inputRow, { paddingBottom: insets.bottom + Metrics.spacing.md }]}
      >
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={t('messagePlaceholder')}
          placeholderTextColor={colors.mutedForeground}
          multiline
        />
        <IconButton
          size={40}
          backgroundColor={colors.primary}
          onPress={handleSend}
          disabled={isSending || !draft.trim()}
        >
          <Send size={Metrics.icon.small} color={colors.primaryForeground} strokeWidth={Metrics.icon.strokeWidth} />
        </IconButton>
      </KeyboardStickyView>
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
      gap: Metrics.spacing.sm,
    },
    headerTitleText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.foreground,
      maxWidth: 180,
    },
    emptyContainer: {
      ...Metrics.layout.centeredContent,
      flex: 1,
      justifyContent: 'center',
      padding: Metrics.spacing.xl,
      gap: Metrics.spacing.md,
    },
    retryButton: {
      backgroundColor: colors.primary,
      borderRadius: Metrics.radius.md,
      paddingVertical: Metrics.spacing.sm,
      paddingHorizontal: Metrics.spacing.lg,
    },
    retryButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primaryForeground,
    },
    messagesScroll: {
      flex: 1,
    },
    messages: {
      ...Metrics.layout.centeredContent,
      padding: Metrics.spacing.lg,
      gap: Metrics.spacing.sm,
    },
    loadMoreButton: {
      alignSelf: 'center',
      paddingVertical: Metrics.spacing.sm,
      paddingHorizontal: Metrics.spacing.md,
    },
    loadMoreButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    messageRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: Metrics.spacing.xs,
    },
    messageRowMine: {
      justifyContent: 'flex-end',
    },
    bubble: {
      maxWidth: '75%',
      borderRadius: Metrics.radius.lg,
      paddingVertical: Metrics.spacing.sm,
      paddingHorizontal: Metrics.spacing.md,
    },
    bubbleTheirs: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    bubbleMine: {
      backgroundColor: colors.primary,
    },
    bubbleText: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.foreground,
    },
    bubbleTextMine: {
      color: colors.primaryForeground,
    },
    offerCard: {
      flex: 1,
      gap: Metrics.spacing.sm,
    },
    offerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.sm,
    },
    offerPlantImage: {
      width: 40,
      height: 40,
      borderRadius: Metrics.radius.md,
      backgroundColor: colors.muted,
    },
    offerPlantImagePlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    offerHeaderText: {
      flex: 1,
    },
    offerTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.leaf,
    },
    offerSubtitle: {
      fontSize: 13,
      color: colors.foreground,
      marginTop: 2,
    },
    offerActions: {
      flexDirection: 'row',
      gap: Metrics.spacing.sm,
    },
    offerDecline: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: colors.destructive,
      borderRadius: Metrics.radius.md,
      paddingVertical: Metrics.spacing.sm,
      alignItems: 'center',
    },
    offerDeclineText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.destructive,
    },
    offerAccept: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: Metrics.radius.md,
      paddingVertical: Metrics.spacing.sm,
      alignItems: 'center',
    },
    offerAcceptText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primaryForeground,
    },
    offerStatus: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.mutedForeground,
    },
    inputRow: {
      ...Metrics.layout.centeredContent,
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: Metrics.spacing.sm,
      padding: Metrics.spacing.md,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    input: {
      flex: 1,
      minHeight: 40,
      maxHeight: 100,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Metrics.radius.lg,
      paddingHorizontal: Metrics.spacing.md,
      paddingVertical: Metrics.spacing.sm,
      fontSize: 14,
      color: colors.foreground,
      backgroundColor: colors.card,
    },
  });
