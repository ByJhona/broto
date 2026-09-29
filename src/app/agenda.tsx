import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import CalendarDays from 'lucide-react-native/icons/calendar-days';
import { Metrics, type ThemeColors, useThemedStyles } from '@/theme';
import { useTranslation } from '@/i18n';
import { CareTaskItem, EmptyState, MultiSelectHeaderActions, RemindersCalendarView, SegmentedControl } from '@/components';
import { useCareTasks, useMultiSelect } from '@/hooks';
import type { CareTask } from '@/types';
import { confirmAndDeleteMany } from '@/utils';

type ViewMode = 'list' | 'calendar';

type AgendaListProps = {
  tasks: CareTask[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  selection: ReturnType<typeof useMultiSelect>;
};

function AgendaList({ tasks, onToggle, onDelete, selection }: Readonly<AgendaListProps>) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('garden');

  if (tasks.length === 0) {
    return <EmptyState icon={CalendarDays} message={t('noRemindersYet')} style={styles.empty} />;
  }

  return (
    <View style={styles.list}>
      {tasks.map((task) => (
        <CareTaskItem
          key={task.id}
          task={task}
          onToggle={onToggle}
          onDelete={onDelete}
          isSelecting={selection.isSelecting}
          isSelected={selection.selectedIds.includes(task.id)}
          onToggleSelected={selection.toggleSelected}
        />
      ))}
    </View>
  );
}

export default function AgendaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('garden');
  const { tasks, toggleTask, deleteTask } = useCareTasks();
  const selection = useMultiSelect();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const pendingFirst = [...tasks].sort((a, b) => Number(a.done) - Number(b.done));

  const handleStartSelecting = () => {
    setViewMode('list');
    selection.startSelecting();
  };

  const handleConfirmDelete = async () => {
    const count = selection.selectedIds.length;
    const title = count === 1 ? t('deleteReminderConfirmTitleOne') : t('deleteRemindersConfirmTitleMany', { count });
    const didDelete = await confirmAndDeleteMany(
      selection.selectedIds,
      deleteTask,
      title,
      t('deleteRemindersConfirmMessage'),
      t('common:delete')
    );
    if (didDelete) selection.stopSelecting();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Metrics.spacing.xl }]}
    >
      <Stack.Screen
        options={{
          headerRight: () => (
            <MultiSelectHeaderActions
              isSelecting={selection.isSelecting}
              selectedCount={selection.selectedIds.length}
              selectAccessibilityLabel={t('selectRemindersAction')}
              onAdd={() => router.push('/task/new')}
              onStartSelecting={handleStartSelecting}
              onCancelSelecting={selection.stopSelecting}
              onConfirmDelete={handleConfirmDelete}
            />
          ),
        }}
      />

      {selection.isSelecting ? null : (
        <SegmentedControl
          options={[
            { value: 'list', label: t('viewList') },
            { value: 'calendar', label: t('viewCalendar') },
          ]}
          value={viewMode}
          onChange={setViewMode}
          style={styles.segmented}
        />
      )}

      {viewMode === 'calendar' ? (
        <RemindersCalendarView tasks={pendingFirst} onToggle={toggleTask} onDelete={deleteTask} />
      ) : (
        <AgendaList tasks={pendingFirst} onToggle={toggleTask} onDelete={deleteTask} selection={selection} />
      )}
    </ScrollView>
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
      flexGrow: 1,
      paddingHorizontal: Metrics.spacing.lg,
      paddingTop: Metrics.spacing.md,
    },
    segmented: {
      marginBottom: Metrics.spacing.md,
    },
    list: {
      gap: Metrics.spacing.sm,
    },
    empty: {
      flex: 1,
      justifyContent: 'center',
    },
  });
