import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Plus from 'lucide-react-native/icons/plus';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import type { CareTask } from '@/types';
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

  const reminders = tasks
    .filter((task) => task.plantId === plantId && task.category !== 'growth_check')
    .sort((a, b) => Number(a.done) - Number(b.done));

  return (
    <View style={styles.section}>
      <View style={styles.remindersHeader}>
        <SectionTitle style={styles.remindersSectionTitle}>Lembretes</SectionTitle>
        <Pressable
          style={styles.addReminderButton}
          onPress={() => router.push({ pathname: '/task/new', params: { plantId } })}
          hitSlop={8}
        >
          <Plus size={Metrics.icon.small} color={colors.primary} strokeWidth={Metrics.icon.strokeWidth} />
        </Pressable>
      </View>

      {reminders.length === 0 ? (
        <Text style={styles.emptyRemindersText}>Nenhum lembrete pra essa planta ainda.</Text>
      ) : (
        reminders.map((task) => (
          <View key={task.id} style={styles.reminderItemSpacing}>
            <CareTaskItem task={task} onToggle={onToggle} />
          </View>
        ))
      )}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  section: {
    backgroundColor: colors.card,
    borderRadius: Metrics.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Metrics.spacing.md,
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
