import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import type { CareTask } from '@/types';
import { today } from '@/utils';
import { CareTaskItem } from '../CareTaskItem';
import { SectionHeading } from '../InfoSection';
import { tasksForToday } from './careSchedule';

const VISIBLE_LIMIT = 4;

type TodayCareSectionProps = {
  tasks: CareTask[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
};

function emptyMessage(hasReminders: boolean, t: (key: string) => string): string {
  return hasReminders ? t('todayEmpty') : t('todayNoReminders');
}

export function TodayCareSection({ tasks, onToggle, onDelete }: Readonly<TodayCareSectionProps>) {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('garden');
  const [keptIds, setKeptIds] = useState<ReadonlySet<string>>(() => new Set());
  const dueTasks = tasksForToday(tasks, today(), keptIds);
  const visibleTasks = dueTasks.slice(0, VISIBLE_LIMIT);
  const hiddenCount = dueTasks.length - visibleTasks.length;

  const handleToggle = useCallback(
    (id: string) => {
      setKeptIds((current) => new Set(current).add(id));
      onToggle(id);
    },
    [onToggle]
  );

  return (
    <View style={styles.section}>
      <SectionHeading title={t('todayTitle')} actionLabel={t('seeAgenda')} onAction={() => router.push('/agenda')} style={styles.heading} />

      {visibleTasks.length === 0 ? (
        <Text style={styles.emptyText}>{emptyMessage(tasks.length > 0, t)}</Text>
      ) : (
        <View style={styles.list}>
          {visibleTasks.map((task) => (
            <CareTaskItem key={task.id} task={task} onToggle={handleToggle} onDelete={onDelete} />
          ))}
        </View>
      )}

      {hiddenCount > 0 ? <Text style={styles.moreText}>{t('todayMore', { count: hiddenCount })}</Text> : null}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    section: {
      marginBottom: Metrics.spacing.lg,
    },
    heading: {
      marginBottom: Metrics.spacing.sm,
    },
    list: {
      gap: Metrics.spacing.sm,
    },
    emptyText: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
    },
    moreText: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
      marginTop: Metrics.spacing.sm,
    },
  });
