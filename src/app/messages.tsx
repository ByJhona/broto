import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MessageSquare from 'lucide-react-native/icons/message-square';
import Square from 'lucide-react-native/icons/square';
import SquareCheck from 'lucide-react-native/icons/square-check';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import {
  Avatar,
  EmptyState,
  FloatingScreenControls,
  ListRow,
  MultiSelectHeaderActions,
  ScreenHeader,
  SkeletonBlock,
  useScreenTopInset,
} from '@/components';
import { useConversations, useMultiSelect } from '@/hooks';
import { confirm, confirmAndDeleteMany, formatShortDate } from '@/utils';
import type { ChatConversation } from '@/types';

type ConversationTrailingIconProps = {
  isSelecting: boolean;
  isSelected: boolean;
  hasUnread: boolean;
  colors: ThemeColors;
  styles: ReturnType<typeof makeStyles>;
};

function ConversationTrailingIcon({ isSelecting, isSelected, hasUnread, colors, styles }: Readonly<ConversationTrailingIconProps>) {
  if (isSelecting) {
    if (isSelected) return <SquareCheck size={Metrics.icon.normal} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />;
    return <Square size={Metrics.icon.normal} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />;
  }
  if (hasUnread) return <View style={styles.unreadDot} />;
  return null;
}

const SKELETON_ROWS = ['a', 'b', 'c', 'd'];

async function handleLongPressDelete(
  conversation: ChatConversation,
  onDelete: (id: string) => void,
  t: (key: string, options?: Record<string, unknown>) => string
) {
  const confirmed = await confirm(
    t('deleteConversationConfirmTitleOne'),
    t('deleteConversationConfirmMessageOne', { name: conversation.otherUserName }),
    { confirmLabel: t('common:delete'), destructive: true }
  );
  if (confirmed) onDelete(conversation.otherUserId);
}

export default function MessagesScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = useScreenTopInset();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('messages');
  const { conversations, isLoading, removeConversation, isLoadingMore, loadMore } = useConversations();
  const selection = useMultiSelect();

  const handleConfirmDeleteMany = async () => {
    const title =
      selection.selectedIds.length === 1
        ? t('deleteConversationConfirmTitleOne')
        : t('deleteConversationsConfirmTitleMany', { count: selection.selectedIds.length });
    const didDelete = await confirmAndDeleteMany(
      selection.selectedIds,
      removeConversation,
      title,
      t('deleteConversationsConfirmMessage'),
      t('common:delete')
    );
    if (didDelete) selection.stopSelecting();
  };

  const header = (
    <ScreenHeader
      title={t('title')}
      trailing={
        conversations.length > 0 ? (
          <MultiSelectHeaderActions
            isSelecting={selection.isSelecting}
            selectedCount={selection.selectedIds.length}
            selectAccessibilityLabel={t('selectConversationsAction')}
            onStartSelecting={selection.startSelecting}
            onCancelSelecting={selection.stopSelecting}
            onConfirmDelete={handleConfirmDeleteMany}
          />
        ) : undefined
      }
    />
  );

  const emptyState = isLoading ? (
    <View style={styles.skeleton}>
      {SKELETON_ROWS.map((key) => (
        <SkeletonBlock key={key} height={Metrics.size.xxl} radius={Metrics.radius.lg} />
      ))}
    </View>
  ) : (
    <EmptyState icon={MessageSquare} title={t('emptyTitle')} message={t('emptyMessage')} style={styles.empty} />
  );

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={[styles.list, { paddingTop: topInset, paddingBottom: insets.bottom + Metrics.spacing.lg }]}
        ListHeaderComponent={header}
        ListEmptyComponent={emptyState}
        data={conversations}
        keyExtractor={(item) => item.otherUserId}
        renderItem={({ item }) => {
          const isSelected = selection.selectedIds.includes(item.otherUserId);
          const trailing = (
            <ConversationTrailingIcon
              isSelecting={selection.isSelecting}
              isSelected={isSelected}
              hasUnread={item.hasUnread}
              colors={colors}
              styles={styles}
            />
          );

          return (
            <ListRow
              variant="card"
              selected={isSelected}
              leading={<Avatar name={item.otherUserName} url={item.otherUserAvatarUrl} size={Metrics.size.lg} />}
              title={item.otherUserName}
              titleTrailing={<Text style={styles.date}>{formatShortDate(item.lastMessageAt)}</Text>}
              subtitle={item.lastMessagePreview}
              trailing={trailing}
              onPress={() => {
                if (selection.isSelecting) {
                  selection.toggleSelected(item.otherUserId);
                } else {
                  router.push({ pathname: '/chat', params: { otherUserId: item.otherUserId } });
                }
              }}
              onLongPress={() => {
                if (selection.isSelecting) return;
                handleLongPressDelete(item, removeConversation, t);
              }}
            />
          );
        }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={isLoadingMore ? <ActivityIndicator style={styles.loadingMore} color={colors.leaf} /> : null}
      />
      <FloatingScreenControls />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    empty: {
      marginTop: Metrics.spacing.xl,
    },
    skeleton: {
      gap: Metrics.spacing.sm,
    },
    list: {
      ...Metrics.layout.centeredContent,
      padding: Metrics.spacing.lg,
      gap: Metrics.spacing.sm,
    },
    date: {
      ...Typography.caption,
      color: colors.mutedForeground,
    },
    unreadDot: {
      width: Metrics.size.dot,
      height: Metrics.size.dot,
      borderRadius: Metrics.radius.full,
      backgroundColor: colors.destructive,
    },
    loadingMore: {
      paddingVertical: Metrics.spacing.lg,
    },
  });
