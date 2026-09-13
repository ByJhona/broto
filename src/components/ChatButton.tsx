import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import MessageSquare from 'lucide-react-native/icons/message-square';
import { Metrics, useColors } from '@/theme';

type ChatButtonProps = {
  size?: number;
  style?: ViewStyle;
};

export function ChatButton({ size = Metrics.icon.normal, style }: Readonly<ChatButtonProps>) {
  const router = useRouter();
  const colors = useColors();

  return (
    <Pressable
      onPress={() => router.push('/messages')}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Mensagens"
      style={({ pressed }) => [styles.container, { opacity: pressed ? 0.7 : 1 }, style]}
    >
      <MessageSquare size={size} color={colors.leafForeground} strokeWidth={Metrics.icon.strokeWidth} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
