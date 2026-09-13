import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import Bell from 'lucide-react-native/icons/bell';
import BellOff from 'lucide-react-native/icons/bell-off';
import Heart from 'lucide-react-native/icons/heart';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import MessageSquare from 'lucide-react-native/icons/message-square';
import Sprout from 'lucide-react-native/icons/sprout';
import Trash2 from 'lucide-react-native/icons/trash-2';
import X from 'lucide-react-native/icons/x';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { Card, EmptyState, IconBadge, LoadingScreen } from '@/components';
import { useNotifications } from '@/hooks';
import { confirm, notificationCopy } from '@/utils';
import type { NotificationType } from '@/types';

const TYPE_ICONS: Record<NotificationType, typeof Heart> = {
  like: Heart,
  comment: MessageCircle,
  system: Bell,
  listing_interest: Sprout,
  listing_message: MessageSquare,
};

export default function NotificationsScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { notifications, isLoading, deleteOne, clearAll } = useNotifications();

  const handleClearAll = async () => {
    const confirmed = await confirm('Limpar notificações', 'Isso apaga todas as suas notificações. Não dá pra desfazer.', {
      confirmLabel: 'Limpar tudo',
      destructive: true,
    });
    if (confirmed) clearAll();
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={BellOff}
        title="Nenhuma notificação"
        message="Você será avisado aqui quando suas plantas precisarem de cuidados."
        style={styles.centered}
      />
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={handleClearAll} hitSlop={8}>
              <Trash2 size={Metrics.icon.normal} color={colors.destructive} strokeWidth={Metrics.icon.strokeWidth} />
            </Pressable>
          ),
        }}
      />
      <FlatList
        style={styles.container}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Metrics.spacing.lg }]}
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const Icon = TYPE_ICONS[item.type];
          const { title, message } = notificationCopy(item);
          const handlePress = () => {
            if (item.postId) {
              router.push({ pathname: '/post/[id]', params: { id: item.postId } });
            } else if (item.type === 'listing_message' && item.actorId) {
              router.push({ pathname: '/chat', params: { otherUserId: item.actorId } });
            } else if (item.listingId) {
              router.push({ pathname: '/listing/[id]', params: { id: item.listingId } });
            }
          };
          const isPressable = !!item.postId || !!item.listingId || (item.type === 'listing_message' && !!item.actorId);
          return (
            <Card style={styles.item} disabled={!isPressable} onPress={handlePress}>
              <IconBadge size={32}>
                <Icon size={Metrics.icon.small} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
              </IconBadge>
              <View style={styles.itemBody}>
                <Text style={styles.itemTitle}>{title}</Text>
                <Text style={styles.itemMessage}>{message}</Text>
              </View>
              <Pressable onPress={() => deleteOne(item.id)} hitSlop={8}>
                <X size={18} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
              </Pressable>
            </Card>
          );
        }}
      />
    </>
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
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Metrics.spacing.sm,
  },
  itemBody: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.foreground,
  },
  itemMessage: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  });
