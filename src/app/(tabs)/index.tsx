import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Eye from 'lucide-react-native/icons/eye';
import EyeOff from 'lucide-react-native/icons/eye-off';
import Plus from 'lucide-react-native/icons/plus';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { CareTaskItem, CreditsCard, HomeHeader } from '@/components';
import { useCareTasks } from '@/hooks';
import { confirm, today } from '@/utils';

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { tasks, isLoading, toggleTask, deleteTask, refresh } = useCareTasks();
  const [showCompleted, setShowCompleted] = useState(false);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  const handlePullRefresh = async () => {
    setIsPullRefreshing(true);
    await refresh();
    setIsPullRefreshing(false);
  };

  const todayDate = today();
  const pendingTasks = tasks.filter((task) => !task.done).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const dueTasks = pendingTasks.filter((task) => task.dueDate <= todayDate);
  const upcomingTasks = pendingTasks.filter((task) => task.dueDate > todayDate);
  const completedTasks = tasks.filter((task) => task.done);

  const handleLongPress = useCallback(
    async (id: string) => {
      const confirmed = await confirm('Excluir lembrete', 'Você não vai mais receber lembretes pra essa tarefa.', {
        confirmLabel: 'Excluir',
        destructive: true,
      });
      if (confirmed) deleteTask(id);
    },
    [deleteTask]
  );

  return (
    <ScrollView
      style={styles.container}
      bounces
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isPullRefreshing} onRefresh={handlePullRefresh} tintColor={colors.leaf} colors={[colors.leaf]} />
      }
    >
      <HomeHeader />

      <View style={styles.shortcut}>
        <CreditsCard />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Para hoje</Text>
          <View style={styles.sectionActions}>
            {completedTasks.length > 0 ? (
              <Pressable style={styles.addButton} onPress={() => setShowCompleted((current) => !current)} hitSlop={8}>
                {showCompleted ? (
                  <Eye size={Metrics.icon.small} color={colors.primary} strokeWidth={Metrics.icon.strokeWidth} />
                ) : (
                  <EyeOff size={Metrics.icon.small} color={colors.primary} strokeWidth={Metrics.icon.strokeWidth} />
                )}
              </Pressable>
            ) : null}
            <Pressable style={styles.addButton} onPress={() => router.push('/task/new')} hitSlop={8}>
              <Plus size={Metrics.icon.small} color={colors.primary} strokeWidth={Metrics.icon.strokeWidth} />
            </Pressable>
          </View>
        </View>

        {!isLoading && dueTasks.length === 0 ? (
          <Text style={styles.emptyText}>Tudo em dia por hoje.</Text>
        ) : (
          <View style={styles.taskList}>
            {dueTasks.map((task) => (
              <CareTaskItem key={task.id} task={task} onToggle={toggleTask} onLongPress={handleLongPress} />
            ))}
          </View>
        )}
      </View>

      {upcomingTasks.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Próximos</Text>
          <View style={styles.taskList}>
            {upcomingTasks.map((task) => (
              <CareTaskItem key={task.id} task={task} onToggle={toggleTask} onLongPress={handleLongPress} />
            ))}
          </View>
        </View>
      ) : null}

      {showCompleted && completedTasks.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Concluídas</Text>
          <View style={styles.taskList}>
            {completedTasks.map((task) => (
              <CareTaskItem key={task.id} task={task} onToggle={toggleTask} onLongPress={handleLongPress} />
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  shortcut: {
    paddingHorizontal: Metrics.spacing.lg,
    marginTop: Metrics.spacing.lg,
  },
  section: {
    padding: Metrics.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Metrics.spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    marginBottom: Metrics.spacing.sm,
  },
  sectionActions: {
    flexDirection: 'row',
    gap: Metrics.spacing.xs,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: Metrics.radius.full,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskList: {
    gap: Metrics.spacing.sm,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: 14,
  },
  });
