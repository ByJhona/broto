import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { useTranslation } from '@/i18n';
import { useMultiSelect, usePersistedCollapse } from '@/hooks';
import { confirmAndDeleteMany } from '@/utils';
import type { CareTask } from '@/types';
import { Card } from './Card';
import { CareTaskItem } from './CareTaskItem';
import { CollapsibleSection } from './CollapsibleSection';
import { MultiSelectHeaderActions } from './MultiSelectHeaderActions';

const REMINDERS_COLLAPSED_KEY = 'broto:garden-reminders-collapsed';

function remindersSectionTitle(count: number, t: (key: string, options?: Record<string, unknown>) => string): string {
  return count > 0 ? t('remindersTitleWithCount', { count }) : t('remindersTitle');
}

type GardenRemindersSectionProps = {
  tasks: CareTask[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
};

export function GardenRemindersSection({ tasks, onToggle, onDelete }: Readonly<GardenRemindersSectionProps>) {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation('garden');
  const { isCollapsed, toggleCollapsed } = usePersistedCollapse(REMINDERS_COLLAPSED_KEY);
  const selection = useMultiSelect();

  const reminders = [...tasks].sort((a, b) => Number(a.done) - Number(b.done));

  const handleConfirmDelete = async () => {
    const title =
      selection.selectedIds.length === 1
        ? t('deleteReminderConfirmTitleOne')
        : t('deleteRemindersConfirmTitleMany', { count: selection.selectedIds.length });
    const didDelete = await confirmAndDeleteMany(
      selection.selectedIds,
      onDelete,
      title,
      t('deleteRemindersConfirmMessage'),
      t('common:delete')
    );
    if (didDelete) selection.stopSelecting();
  };

  return (
    <Card style={styles.section}>
      <CollapsibleSection
        title={remindersSectionTitle(reminders.length, t)}
        style={styles.collapsibleSection}
        headerAction={
          <MultiSelectHeaderActions
            isSelecting={selection.isSelecting}
            selectedCount={selection.selectedIds.length}
            selectAccessibilityLabel={t('selectRemindersAction')}
            onAdd={() => router.push('/task/new')}
            onStartSelecting={selection.startSelecting}
            onCancelSelecting={selection.stopSelecting}
            onConfirmDelete={handleConfirmDelete}
          />
        }
        isCollapsed={isCollapsed}
        onToggleCollapsed={toggleCollapsed}
      >
        {reminders.length === 0 ? (
          <Text style={styles.emptyRemindersText}>{t('noRemindersYet')}</Text>
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
      </CollapsibleSection>
    </Card>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    section: {
      marginBottom: Metrics.spacing.lg,
    },
    collapsibleSection: {
      marginBottom: 0,
    },
    emptyRemindersText: {
      fontSize: 13,
      color: colors.mutedForeground,
    },
    reminderItemSpacing: {
      marginTop: Metrics.spacing.sm,
    },
  });
