import { useMemo } from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MessageSquare from 'lucide-react-native/icons/message-square';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { Avatar, EmptyState, ListRow, LoadingScreen } from '@/components';
import { useConversations } from '@/hooks';
import { formatShortDate } from '@/utils';

export default function MessagesScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { conversations, isLoading } = useConversations();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (conversations.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Nenhuma conversa ainda"
        message="Suas conversas sobre ofertas de plantas vão aparecer aqui."
        style={styles.centered}
      />
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Metrics.spacing.lg }]}
      data={conversations}
      keyExtractor={(item) => item.otherUserId}
      renderItem={({ item }) => (
        <ListRow
          variant="card"
          leading={<Avatar name={item.otherUserName} url={item.otherUserAvatarUrl} size={48} />}
          title={item.otherUserName}
          titleTrailing={<Text style={styles.date}>{formatShortDate(item.lastMessageAt)}</Text>}
          subtitle={item.lastMessagePreview}
          onPress={() => router.push({ pathname: '/chat', params: { otherUserId: item.otherUserId } })}
        />
      )}
    />
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centered: {
      ...Metrics.layout.centeredContent,
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: Metrics.spacing.xl,
      backgroundColor: colors.background,
    },
    list: {
      ...Metrics.layout.centeredContent,
      padding: Metrics.spacing.lg,
      gap: Metrics.spacing.sm,
    },
    date: {
      fontSize: 12,
      color: colors.mutedForeground,
    },
  });
