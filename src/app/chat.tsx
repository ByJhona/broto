import { useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Leaf from 'lucide-react-native/icons/leaf';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import Send from 'lucide-react-native/icons/send';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { Avatar, Card, EmptyState, IconButton, LoadingScreen } from '@/components';
import { useChat } from '@/hooks';
import { getProfile } from '@/services';
import { Toast } from '@/utils';
import type { ChatMessage, OfferStatus } from '@/types';

const OFFER_STATUS_LABEL: Record<OfferStatus, string> = {
  pending: 'Aguardando resposta',
  accepted: 'Troca aceita',
  declined: 'Troca recusada',
};

export default function ChatScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const scrollRef = useRef<ScrollView>(null);
  const { otherUserId } = useLocalSearchParams<{ otherUserId: string }>();
  const [draft, setDraft] = useState('');

  const { messages, isLoading, sendMessage, isSending, respondToOfferMessage, currentUserId } = useChat(otherUserId);

  const otherUserQuery = useQuery({
    queryKey: ['profile', otherUserId],
    queryFn: () => getProfile(otherUserId),
    enabled: !!otherUserId,
  });

  const otherUserName = otherUserQuery.data?.name || otherUserQuery.data?.username || 'Conversa';

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
      Toast.error(err instanceof Error ? err.message : 'Não foi possível enviar a mensagem.');
    }
  };

  const handleRespond = async (messageId: string, accept: boolean) => {
    try {
      await respondToOfferMessage({ messageId, accept });
    } catch (err) {
      Toast.error(err instanceof Error ? err.message : 'Não foi possível responder a proposta.');
    }
  };

  const renderOfferCard = (message: ChatMessage, isMine: boolean) => (
    <Card style={styles.offerCard}>
      <View style={styles.offerHeader}>
        {message.offeredPlantPhotoUrl ? (
          <Image source={{ uri: message.offeredPlantPhotoUrl }} style={styles.offerPlantImage} />
        ) : (
          <View style={[styles.offerPlantImage, styles.offerPlantImagePlaceholder]}>
            <Leaf size={20} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
          </View>
        )}
        <View style={styles.offerHeaderText}>
          <Text style={styles.offerTitle}>Proposta de troca</Text>
          <Text style={styles.offerSubtitle}>
            {message.offeredPlantName} pela oferta &quot;{message.listingTitle}&quot;
          </Text>
        </View>
      </View>

      {!isMine && message.offerStatus === 'pending' ? (
        <View style={styles.offerActions}>
          <Pressable style={styles.offerDecline} onPress={() => handleRespond(message.id, false)}>
            <Text style={styles.offerDeclineText}>Recusar</Text>
          </Pressable>
          <Pressable style={styles.offerAccept} onPress={() => handleRespond(message.id, true)}>
            <Text style={styles.offerAcceptText}>Aceitar</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.offerStatus}>{OFFER_STATUS_LABEL[message.offerStatus ?? 'pending']}</Text>
      )}
    </Card>
  );

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

      {messages.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          message="Nenhuma mensagem ainda. Comece a conversa!"
          style={styles.emptyContainer}
        />
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.messagesScroll}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((message) => {
            const isMine = message.senderId === currentUserId;
            return (
              <View key={message.id} style={[styles.messageRow, isMine && styles.messageRowMine]}>
                {message.messageType === 'offer' ? (
                  renderOfferCard(message, isMine)
                ) : (
                  <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{message.body}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      <KeyboardStickyView style={[styles.inputRow, { paddingBottom: insets.bottom + Metrics.spacing.md }]}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Escreva uma mensagem..."
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
    },
    messagesScroll: {
      flex: 1,
    },
    messages: {
      ...Metrics.layout.centeredContent,
      padding: Metrics.spacing.lg,
      gap: Metrics.spacing.sm,
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
