import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import BellPlus from 'lucide-react-native/icons/bell-plus';
import Droplet from 'lucide-react-native/icons/droplet';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { useCareTasks } from '@/hooks';
import { TASK_CATEGORY, type CareTask, type Plant } from '@/types';
import { Toast } from '@/utils';
import { CareTaskItem } from '../CareTaskItem';
import { OutlineButton } from '../OutlineButton';
import { InfoSection } from '../InfoSection';

function plantTasks(tasks: CareTask[], plantId: string): CareTask[] {
  return tasks
    .filter((task) => task.plantId === plantId)
    .sort((a, b) => Number(a.done) - Number(b.done) || a.dueDate.localeCompare(b.dueDate));
}

type WateringSuggestionProps = {
  plant: Plant;
  days: number;
};

function WateringSuggestion({ plant, days }: Readonly<WateringSuggestionProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('plant');
  const { createTask } = useCareTasks();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      await createTask({
        title: t('wateringTaskTitle', { name: plant.name }),
        plantId: plant.id,
        plantName: plant.name,
        plantPhotoUrl: plant.photoUrls[0] ?? null,
        category: TASK_CATEGORY.WATERING,
        recurrenceDays: days,
      });
      Toast.success(t('wateringReminderCreated'));
    } catch {
      Toast.error(t('reminderCreateError'));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View style={styles.suggestion}>
      <View style={styles.suggestionHeader}>
        <Droplet size={Metrics.icon.small} color={colors.leaf} strokeWidth={Metrics.icon.stroke.regular} />
        <Text style={styles.suggestionTitle}>{t('wateringSuggestionTitle')}</Text>
      </View>
      <Text style={styles.suggestionText}>{t('wateringSuggestionMessage', { days })}</Text>
      <OutlineButton
        label={t('wateringSuggestionCta', { days })}
        icon={BellPlus}
        onPress={handleCreate}
        loading={isCreating}
        style={styles.suggestionButton}
      />
    </View>
  );
}

type PlantCareNowProps = {
  plant: Plant;
  suggestedWateringDays: number | null;
};

export function PlantCareNow({ plant, suggestedWateringDays }: Readonly<PlantCareNowProps>) {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('plant');
  const { tasks, toggleTask, deleteTask } = useCareTasks();
  const reminders = plantTasks(tasks, plant.id);
  const hasWateringReminder = reminders.some((task) => task.category === TASK_CATEGORY.WATERING);

  return (
    <InfoSection
      title={t('careNowTitle')}
      actionLabel={t('newReminder')}
      onAction={() => router.push({ pathname: '/task/new', params: { plantId: plant.id } })}
    >
      {!hasWateringReminder && suggestedWateringDays ? <WateringSuggestion plant={plant} days={suggestedWateringDays} /> : null}
      <View style={styles.list}>
        {reminders.map((task) => (
          <CareTaskItem key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
        ))}
      </View>
    </InfoSection>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    list: {
      gap: Metrics.spacing.sm,
    },
    suggestion: {
      borderRadius: Metrics.radius.lg,
      backgroundColor: colors.muted,
      padding: Metrics.spacing.md,
      marginBottom: Metrics.spacing.sm,
    },
    suggestionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.sm,
    },
    suggestionTitle: {
      ...Typography.heading,
      color: colors.foreground,
    },
    suggestionText: {
      ...Typography.bodySmall,
      color: colors.foreground,
      marginTop: Metrics.spacing.xs,
    },
    suggestionButton: {
      marginTop: Metrics.spacing.md,
      alignSelf: 'flex-start',
    },
  });
