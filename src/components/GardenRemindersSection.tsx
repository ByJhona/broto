import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Plus from 'lucide-react-native/icons/plus';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { useTranslation } from '@/i18n';
import { usePersistedCollapse } from '@/hooks';
import type { CareTask } from '@/types';
import { Card } from './Card';
import { CareTaskItem } from './CareTaskItem';
import { CollapsibleSection } from './CollapsibleSection';

const REMINDERS_COLLAPSED_KEY = 'broto:garden-reminders-collapsed';

function remindersSectionTitle(count: number, t: (key: string, options?: Record<string, unknown>) => string): string {
  return count > 0 ? t('remindersTitleWithCount', { count }) : t('remindersTitle');
}

type GardenRemindersSectionProps = {
  tasks: CareTask[];
  onToggle: (id: string) => void;
};

export function GardenRemindersSection({ tasks, onToggle }: Readonly<GardenRemindersSectionProps>) {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation('garden');
  const { isCollapsed, toggleCollapsed } = usePersistedCollapse(REMINDERS_COLLAPSED_KEY);

  const reminders = [...tasks].sort((a, b) => Number(a.done) - Number(b.done));

  return (
    <Card style={styles.section}>
      <CollapsibleSection
        title={remindersSectionTitle(reminders.length, t)}
        style={styles.collapsibleSection}
        headerAction={
          <Pressable style={styles.addReminderButton} onPress={() => router.push('/task/new')} hitSlop={8}>
            <Plus size={Metrics.icon.small} color={colors.primary} strokeWidth={Metrics.icon.strokeWidth} />
          </Pressable>
        }
        isCollapsed={isCollapsed}
        onToggleCollapsed={toggleCollapsed}
      >
        {reminders.length === 0 ? (
          <Text style={styles.emptyRemindersText}>{t('noRemindersYet')}</Text>
        ) : (
          reminders.map((task) => (
            <View key={task.id} style={styles.reminderItemSpacing}>
              <CareTaskItem task={task} onToggle={onToggle} />
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
    },
    reminderItemSpacing: {
      marginTop: Metrics.spacing.sm,
    },
  });
