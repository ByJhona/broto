import { useMemo } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import MessageSquare from 'lucide-react-native/icons/message-square';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { useTranslation } from '@/i18n';

type ChatButtonProps = {
  hasUnread?: boolean;
  size?: number;
  style?: ViewStyle;
};

export function ChatButton({ hasUnread = false, size = Metrics.icon.normal, style }: Readonly<ChatButtonProps>) {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation('chat');

  return (
    <Pressable
      onPress={() => router.push('/messages')}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={hasUnread ? t('accessibilityLabelUnread') : t('accessibilityLabel')}
      style={({ pressed }) => [styles.container, { opacity: pressed ? 0.7 : 1 }, style]}
    >
      <MessageSquare size={size} color={colors.leafForeground} strokeWidth={Metrics.icon.strokeWidth} />
      {hasUnread && <View style={styles.badge} />}
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    badge: {
      position: 'absolute',
      top: -2,
      right: -2,
      width: 10,
      height: 10,
      borderRadius: Metrics.radius.full,
      backgroundColor: colors.destructive,
      borderWidth: 1.5,
      borderColor: colors.leaf,
    },
  });
