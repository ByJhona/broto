import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { useTranslation } from '@/i18n';
import { useMultiSelect } from '@/hooks';
import { confirmAndDeleteMany } from '@/utils';
import type { CareTask } from '@/types';
import { Card } from './Card';
import { CareTaskItem } from './CareTaskItem';
import { MultiSelectHeaderActions } from './MultiSelectHeaderActions';
import { SectionTitle } from './SectionTitle';

type PlantRemindersSectionProps = {
  plantId: string;
  tasks: CareTask[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
};

export function PlantRemindersSection({ plantId, tasks, onToggle, onDelete }: Readonly<PlantRemindersSectionProps>) {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation('plant');
  const selection = useMultiSelect();

  const reminders = tasks
    .filter((task) => task.plantId === plantId)
    .sort((a, b) => Number(a.done) - Number(b.done));

  const handleConfirmDelete = async () => {
    const title =
      selection.selectedIds.length === 1
        ? t('garden:deleteReminderConfirmTitleOne')
        : t('garden:deleteRemindersConfirmTitleMany', { count: selection.selectedIds.length });
    const didDelete = await confirmAndDeleteMany(
      selection.selectedIds,
      onDelete,
      title,
      t('garden:deleteRemindersConfirmMessage'),
      t('common:delete')
    );
    if (didDelete) selection.stopSelecting();
  };

  return (
    <Card style={styles.section}>
      <View style={styles.remindersHeader}>
        <SectionTitle style={styles.remindersSectionTitle}>{t('remindersTitle')}</SectionTitle>
        <MultiSelectHeaderActions
          isSelecting={selection.isSelecting}
          selectedCount={selection.selectedIds.length}
          selectAccessibilityLabel={t('garden:selectRemindersAction')}
          onAdd={() => router.push({ pathname: '/task/new', params: { plantId } })}
          onStartSelecting={selection.startSelecting}
          onCancelSelecting={selection.stopSelecting}
          onConfirmDelete={handleConfirmDelete}
        />
      </View>

      {reminders.length === 0 ? (
        <Text style={styles.emptyRemindersText}>{t('noPlantRemindersYet')}</Text>
      ) : (
        reminders.map((task) => (
          <View key={task.id} style={styles.reminderItemSpacing}>
            <CareTaskItem
              task={task}
              onToggle={onToggle}
              onDelete={onDelete}
              isSelecting={selection.isSelecting}
              isSelected={selection.selectedIds.includes(task.id)}
              onToggleSelected={selection.toggleSelected}
            />
          </View>
        ))
      )}
    </Card>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  section: {
    marginBottom: Metrics.spacing.lg,
  },
  remindersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  remindersSectionTitle: {
    marginBottom: 0,
  },
  emptyRemindersText: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: Metrics.spacing.sm,
  },
  reminderItemSpacing: {
    marginTop: Metrics.spacing.sm,
  },
  });
