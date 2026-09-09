import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Leaf from 'lucide-react-native/icons/leaf';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import Send from 'lucide-react-native/icons/send';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { IconBadge } from './IconBadge';
import { useCreditsGate } from '@/hooks';
import { askPlantQuestion, CREDIT_COSTS, InsufficientCreditsError, type PlantChatMessage } from '@/services';
import { Alert, Toast } from '@/utils';

const MAX_VISIBLE_MESSAGES = 50;
const CHAT_BOX_MAX_HEIGHT = 320;

type PlantChatProps = {
  plantId: string;
};

export function PlantChat({ plantId }: Readonly<PlantChatProps>) {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { canAffordCost, applyCreditBalance } = useCreditsGate();
  const scrollRef = useRef<ScrollView>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PlantChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleUnlock = () => {
    setSessionId(null);
    setMessages([]);
    setIsUnlocked(true);
  };

  const creditCost = CREDIT_COSTS.chat_question;

  const appendMessage = (message: PlantChatMessage) => {
    setMessages((current) => [...current, message].slice(-MAX_VISIBLE_MESSAGES));
  };

  const showInsufficientCreditsAlert = () => {
    Alert.alert(
      'Créditos insuficientes',
      `Essa pergunta custa ${creditCost} crédito. Veja os planos pra continuar.`,
      [
        { text: 'Agora não', style: 'cancel' },
        { text: 'Ver planos', onPress: () => router.push('/profile/plans') },
      ]
    );
  };

  const handleSend = async () => {
    const question = draft.trim();
    if (!question || isSending) return;

    if (!canAffordCost(creditCost)) {
      showInsufficientCreditsAlert();
      return;
    }

    setDraft('');
    setIsSending(true);

    const optimisticMessage: PlantChatMessage = {
      id: `pending-${Date.now()}`,
      role: 'user',
      content: question,
      createdAt: new Date().toISOString(),
    };
    appendMessage(optimisticMessage);

    try {
      const { message: answer, sessionId: activeSessionId, newCreditBalance } = await askPlantQuestion(
        plantId,
        question,
        sessionId
      );
      setSessionId(activeSessionId);
      appendMessage(answer);
      applyCreditBalance(newCreditBalance);
    } catch (err) {
      setMessages((current) => current.filter((item) => item.id !== optimisticMessage.id));
      setDraft(question);
      if (err instanceof InsufficientCreditsError) {
        showInsufficientCreditsAlert();
      } else {
        Toast.error(err instanceof Error ? err.message : 'Não foi possível enviar sua pergunta.');
      }
    } finally {
      setIsSending(false);
    }
  };

  if (!isUnlocked) {
    return (
      <Pressable style={styles.unlockCard} onPress={handleUnlock}>
        <IconBadge size={44} backgroundColor={colors.leafForeground}>
          <MessageCircle size={20} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
        </IconBadge>
        <Text style={styles.unlockText}>Tire dúvidas sobre o cuidado dessa planta com a IA.</Text>
        <Text style={styles.unlockButtonText}>Toque para conversar</Text>
      </Pressable>
    );
  }

  return (
    <View>
      <View style={styles.chatBox}>
        {messages.length === 0 ? (
          <Text style={styles.emptyText}>Nenhuma pergunta ainda. Pergunte algo sobre o cuidado dessa planta.</Text>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.messagesScroll}
            contentContainerStyle={styles.messages}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((message) => (
              <View
                key={message.id}
                style={[styles.messageRow, message.role === 'user' && styles.messageRowUser]}
              >
                {message.role === 'assistant' ? (
                  <IconBadge size={28} backgroundColor={colors.leafForeground}>
                    <Leaf size={14} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
                  </IconBadge>
                ) : null}
                <View style={[styles.bubble, message.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}>
                  <Text style={[styles.bubbleText, message.role === 'user' && styles.bubbleTextUser]}>
                    {message.content}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {isSending ? <ActivityIndicator style={styles.loader} color={colors.leaf} /> : null}
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Pergunte algo sobre essa planta..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          editable={!isSending}
        />
        <Pressable style={styles.sendButton} onPress={handleSend} disabled={isSending || !draft.trim()}>
          <Send size={Metrics.icon.small} color={colors.primaryForeground} strokeWidth={Metrics.icon.strokeWidth} />
        </Pressable>
      </View>
      <Text style={styles.costHint}>Cada pergunta custa {creditCost} crédito.</Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  unlockCard: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: Metrics.radius.md,
    padding: Metrics.spacing.lg,
    gap: Metrics.spacing.xs,
  },
  unlockText: {
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 18,
  },
  unlockButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginTop: Metrics.spacing.xs,
  },
  chatBox: {
    backgroundColor: colors.background,
    borderRadius: Metrics.radius.md,
    padding: Metrics.spacing.sm,
    marginBottom: Metrics.spacing.md,
    minHeight: 64,
    justifyContent: 'center',
  },
  loader: {
    marginVertical: Metrics.spacing.sm,
  },
  emptyText: {
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  messagesScroll: {
    maxHeight: CHAT_BOX_MAX_HEIGHT,
  },
  messages: {
    gap: Metrics.spacing.sm,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Metrics.spacing.xs,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: Metrics.radius.lg,
    paddingVertical: Metrics.spacing.sm,
    paddingHorizontal: Metrics.spacing.md,
  },
  bubbleAssistant: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.foreground,
  },
  bubbleTextUser: {
    color: colors.primaryForeground,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Metrics.spacing.sm,
    paddingTop: Metrics.spacing.sm,
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
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: Metrics.radius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  costHint: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: Metrics.spacing.xs,
  },
  });
