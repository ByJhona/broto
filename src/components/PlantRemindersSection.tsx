import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Plus from 'lucide-react-native/icons/plus';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { useTranslation } from '@/i18n';
import type { CareTask } from '@/types';
import { Card } from './Card';
import { CareTaskItem } from './CareTaskItem';
import { SectionTitle } from './SectionTitle';

type PlantRemindersSectionProps = {
  plantId: string;
  tasks: CareTask[];
  onToggle: (id: string) => void;
};

export function PlantRemindersSection({ plantId, tasks, onToggle }: Readonly<PlantRemindersSectionProps>) {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation('plant');

  const reminders = tasks
    .filter((task) => task.plantId === plantId)
    .sort((a, b) => Number(a.done) - Number(b.done));

  return (
    <Card style={styles.section}>
      <View style={styles.remindersHeader}>
        <SectionTitle style={styles.remindersSectionTitle}>{t('remindersTitle')}</SectionTitle>
        <Pressable
          style={styles.addReminderButton}
          onPress={() => router.push({ pathname: '/task/new', params: { plantId } })}
          hitSlop={8}
        >
          <Plus size={Metrics.icon.small} color={colors.primary} strokeWidth={Metrics.icon.strokeWidth} />
        </Pressable>
      </View>

      {reminders.length === 0 ? (
        <Text style={styles.emptyRemindersText}>{t('noPlantRemindersYet')}</Text>
      ) : (
        reminders.map((task) => (
          <View key={task.id} style={styles.reminderItemSpacing}>
            <CareTaskItem task={task} onToggle={onToggle} />
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
  addReminderButton: {
    width: 28,
    height: 28,
    borderRadius: Metrics.radius.full,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
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
