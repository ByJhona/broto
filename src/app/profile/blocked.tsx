import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import UserCheck from 'lucide-react-native/icons/user-check';
import { Metrics, useColors, type ThemeColors, useThemedStyles } from '@/theme';
import { useTranslation } from '@/i18n';
import { Avatar, Button, EmptyState, FloatingScreenControls, ListRow, ScreenHeader, useScreenTopInset } from '@/components';
import { useBlockedUsers, useModerationActions } from '@/hooks';
import type { BlockedUser } from '@/types';

export default function BlockedUsersScreen() {
  const insets = useSafeAreaInsets();
  const topInset = useScreenTopInset();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('moderation');
  const blocked = useBlockedUsers();
  const { unblock } = useModerationActions();

  const renderItem = ({ item }: { item: BlockedUser }) => (
    <ListRow
      variant="card"
      leading={<Avatar name={item.profile.name} url={item.profile.avatar_url} size={Metrics.size.md} />}
      title={item.profile.name}
      subtitle={`@${item.profile.username}`}
      trailing={
        <Button
          compact
          variant="secondary"
          label={t('unblockButton')}
          onPress={() => unblock({ id: item.profile.id, name: item.profile.name })}
        />
      }
    />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={blocked.data ?? []}
        keyExtractor={(item) => item.profile.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.content, { paddingTop: topInset, paddingBottom: insets.bottom + Metrics.spacing.xl }]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={<ScreenHeader title={t('blockedUsersTitle')} subtitle={t('blockedUsersSubtitle')} />}
        ListEmptyComponent={
          blocked.isPending ? (
            <ActivityIndicator color={colors.leaf} />
          ) : (
            <EmptyState icon={UserCheck} title={t('blockedUsersEmptyTitle')} message={t('blockedUsersEmptyMessage')} />
          )
        }
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
    content: {
      ...Metrics.layout.centeredContent,
      paddingHorizontal: Metrics.spacing.lg,
    },
    separator: {
      height: Metrics.spacing.sm,
    },
  });
