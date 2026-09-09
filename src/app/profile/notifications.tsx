import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import Bell from 'lucide-react-native/icons/bell';
import BellOff from 'lucide-react-native/icons/bell-off';
import Heart from 'lucide-react-native/icons/heart';
import MessageCircle from 'lucide-react-native/icons/message-circle';
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
};

export default function NotificationsScreen() {
  const router = useRouter();
  const colors = useColors();
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
        contentContainerStyle={styles.list}
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const Icon = TYPE_ICONS[item.type];
          const { title, message } = notificationCopy(item);
          return (
            <Card
              style={styles.item}
              disabled={!item.postId}
              onPress={() => item.postId && router.push({ pathname: '/post/[id]', params: { id: item.postId } })}
            >
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
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Metrics.spacing.xl,
  },
  list: {
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
