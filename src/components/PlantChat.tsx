import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Leaf from 'lucide-react-native/icons/leaf';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography, Motion, Opacity } from '@/theme';
import { useTranslation } from '@/i18n';
import { IconBadge } from './IconBadge';
import { SendButton } from './SendButton';
import { useCreditCosts, useCreditsGate, useReduceMotion } from '@/hooks';
import { askPlantQuestion, InsufficientCreditsError, type PlantChatMessage } from '@/services';
import { Alert, Toast } from '@/utils';

const MAX_VISIBLE_MESSAGES = 50;
const TYPING_DOT_KEYS = ['first', 'second', 'third'] as const;

function useTypingDots(reduceMotion: boolean) {
  const [dots] = useState(() => TYPING_DOT_KEYS.map(() => new Animated.Value(Opacity.faint)));

  useEffect(() => {
    if (reduceMotion) return;
    const pulse = (dot: Animated.Value) =>
      Animated.sequence([
        Animated.timing(dot, { toValue: 1, duration: Motion.medium, useNativeDriver: true }),
        Animated.timing(dot, { toValue: Opacity.faint, duration: Motion.medium, useNativeDriver: true }),
      ]);
    const animation = Animated.loop(Animated.stagger(Motion.medium / 2, dots.map(pulse)));
    animation.start();
    return () => animation.stop();
  }, [dots, reduceMotion]);

  return dots;
}

type TypingBubbleProps = {
  label: string;
  colors: ThemeColors;
  styles: ReturnType<typeof makeStyles>;
};

function TypingBubble({ label, colors, styles }: Readonly<TypingBubbleProps>) {
  const reduceMotion = useReduceMotion();
  const dots = useTypingDots(reduceMotion);

  return (
    <View style={styles.messageRow} accessible accessibilityLabel={label} accessibilityLiveRegion="polite">
      <IconBadge size={Metrics.size.sm} backgroundColor={colors.leafForeground}>
        <Leaf size={Metrics.icon.xs} color={colors.leaf} strokeWidth={Metrics.icon.stroke.regular} />
      </IconBadge>
      <View style={[styles.bubble, styles.bubbleAssistant, styles.typingBubble]}>
        {TYPING_DOT_KEYS.map((key, index) => (
          <Animated.View key={key} style={[styles.typingDot, { opacity: dots[index] }]} />
        ))}
      </View>
    </View>
  );
}

type PlantChatCopy = {
  unlockText: string;
  emptyText: string;
  placeholder: string;
};

function plantChatCopy(plantId: string | null, t: (key: string) => string): PlantChatCopy {
  if (plantId) {
    return {
      unlockText: t('chatUnlockTextForPlant'),
      emptyText: t('chatEmptyTextForPlant'),
      placeholder: t('chatPlaceholderForPlant'),
    };
  }
  return {
    unlockText: t('chatUnlockTextGeneral'),
    emptyText: t('chatEmptyTextGeneral'),
    placeholder: t('chatPlaceholderGeneral'),
  };
}

type PlantChatVariant = 'embedded' | 'screen';

type PlantChatProps = {
  plantId?: string | null;
  variant?: PlantChatVariant;
};

function chatLayoutStyles(styles: ReturnType<typeof makeStyles>, variant: PlantChatVariant) {
  if (variant === 'screen') {
    return { root: styles.screenRoot, chatBox: [styles.chatBox, styles.fill], scroll: styles.fill };
  }
  return { root: undefined, chatBox: styles.chatBox, scroll: styles.messagesScroll };
}

export function PlantChat({ plantId = null, variant = 'embedded' }: Readonly<PlantChatProps>) {
  const router = useRouter();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('plant');
  const { canAffordCost, applyCreditBalance } = useCreditsGate();
  const scrollRef = useRef<ScrollView>(null);
  const [isUnlocked, setIsUnlocked] = useState(variant === 'screen');
  const layout = chatLayoutStyles(styles, variant);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PlantChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const copy = plantChatCopy(plantId, t);
  const canSend = !isSending && draft.trim().length > 0;

  const handleUnlock = () => {
    setSessionId(null);
    setMessages([]);
    setIsUnlocked(true);
  };

  const creditCost = useCreditCosts().chat_question;

  const appendMessage = (message: PlantChatMessage) => {
    setMessages((current) => [...current, message].slice(-MAX_VISIBLE_MESSAGES));
  };

  const showInsufficientCreditsAlert = () => {
    Alert.alert(
      t('insufficientCreditsTitle'),
      t('chatInsufficientCreditsMessage', { cost: creditCost }),
      [
        { text: t('notNow'), style: 'cancel' },
        { text: t('seePlans'), onPress: () => router.push('/profile/plans') },
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
        Toast.error(err instanceof Error ? err.message : t('chatSendError'));
      }
    } finally {
      setIsSending(false);
    }
  };

  if (!isUnlocked) {
    return (
      <Pressable style={styles.unlockCard} onPress={handleUnlock}>
        <IconBadge size={Metrics.size.lg} backgroundColor={colors.leafForeground}>
          <MessageCircle size={Metrics.icon.small} color={colors.leaf} strokeWidth={Metrics.icon.stroke.regular} />
        </IconBadge>
        <Text style={styles.unlockText}>{copy.unlockText}</Text>
        <Text style={styles.unlockButtonText}>{t('chatUnlockButton')}</Text>
      </Pressable>
    );
  }

  return (
    <View style={layout.root}>
      <View style={layout.chatBox}>
        {messages.length === 0 ? (
          <Text style={styles.emptyText}>{copy.emptyText}</Text>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={layout.scroll}
            contentContainerStyle={styles.messages}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            nestedScrollEnabled
            persistentScrollbar
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((message) => (
              <View
                key={message.id}
                style={[styles.messageRow, message.role === 'user' && styles.messageRowUser]}
              >
                {message.role === 'assistant' ? (
                  <IconBadge size={Metrics.size.sm} backgroundColor={colors.leafForeground}>
                    <Leaf size={Metrics.icon.xs} color={colors.leaf} strokeWidth={Metrics.icon.stroke.regular} />
                  </IconBadge>
                ) : null}
                <View style={[styles.bubble, message.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}>
                  <Text style={[styles.bubbleText, message.role === 'user' && styles.bubbleTextUser]}>
                    {message.content}
                  </Text>
                </View>
              </View>
            ))}
            {isSending ? <TypingBubble label={t('chatTypingLabel')} colors={colors} styles={styles} /> : null}
          </ScrollView>
        )}
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={copy.placeholder}
          placeholderTextColor={colors.mutedForeground}
          multiline
          editable={!isSending}
        />
        <SendButton disabled={!canSend} onPress={handleSend} />
      </View>
      <Text style={styles.costHint}>{t('chatCostHint', { cost: creditCost })}</Text>
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
    ...Typography.bodySmall,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  unlockButtonText: {
    ...Typography.labelStrong,
    color: colors.primary,
    marginTop: Metrics.spacing.xs,
  },
  chatBox: {
    backgroundColor: colors.background,
    borderRadius: Metrics.radius.md,
    padding: Metrics.spacing.sm,
    marginBottom: Metrics.spacing.md,
    minHeight: Metrics.size.xxl,
    justifyContent: 'center',
  },
  emptyText: {
    ...Typography.bodySmall,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  screenRoot: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
  messagesScroll: {
    maxHeight: Metrics.layout.chatBoxMaxHeight,
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
    borderWidth: Metrics.borderWidth.sm,
    borderColor: colors.border,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.xs,
    paddingVertical: Metrics.spacing.md,
  },
  typingDot: {
    width: Metrics.size.dot,
    height: Metrics.size.dot,
    borderRadius: Metrics.radius.full,
    backgroundColor: colors.mutedForeground,
  },
  bubbleText: {
    ...Typography.bodySmall,
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
    borderTopWidth: Metrics.borderWidth.sm,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    minHeight: Metrics.size.md,
    maxHeight: Metrics.size.hero,
    borderWidth: Metrics.borderWidth.sm,
    borderColor: colors.border,
    borderRadius: Metrics.radius.lg,
    paddingHorizontal: Metrics.spacing.md,
    paddingVertical: Metrics.spacing.sm,
    ...Typography.inputSmall,
    color: colors.foreground,
    backgroundColor: colors.card,
  },
  costHint: {
    ...Typography.caption,
    color: colors.mutedForeground,
    marginTop: Metrics.spacing.xs,
  },
  });
