import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Clock from 'lucide-react-native/icons/clock';
import Leaf from 'lucide-react-native/icons/leaf';
import Minus from 'lucide-react-native/icons/minus';
import Plus from 'lucide-react-native/icons/plus';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { FormError, FormField, PillSelector, PlantPickerRow, SubmitButton } from '@/components';
import { useCareTasks, usePlants } from '@/hooks';
import { requestExactAlarmAccessOnce } from '@/services';
import { TASK_CATEGORIES } from '@/utils';
import type { TaskCategory } from '@/types';

type RecurrenceMode = 'once' | 'repeat';

const RECURRENCE_OPTIONS = [
  { value: 'once' as RecurrenceMode, label: 'Só uma vez' },
  { value: 'repeat' as RecurrenceMode, label: 'Repetir' },
];

function dateForTime(hour: number, minute: number): Date {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

const DEFAULT_RECURRENCE_DAYS = 3;
const MIN_RECURRENCE_DAYS = 1;
const MAX_RECURRENCE_DAYS = 365;

export default function NewTaskScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const params = useLocalSearchParams<{ plantId?: string }>();
  const { createTask } = useCareTasks();
  const { plants } = usePlants();

  const isPlantLocked = !!params.plantId;

  const [title, setTitle] = useState('');
  const [plantId, setPlantId] = useState<string | null>(params.plantId ?? null);
  const [category, setCategory] = useState<TaskCategory>('watering');
  const [recurrenceDays, setRecurrenceDays] = useState<number | null>(DEFAULT_RECURRENCE_DAYS);
  const [hasEditedRecurrence, setHasEditedRecurrence] = useState(false);
  const [lastSuggestedRecurrenceDays, setLastSuggestedRecurrenceDays] = useState<number | null>(null);
  const [reminderHour, setReminderHour] = useState(9);
  const [reminderMinute, setReminderMinute] = useState(0);
  const [isIosTimePickerOpen, setIsIosTimePickerOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedPlant = plants.find((plant) => plant.id === plantId) ?? null;

  const suggestedRecurrenceDays = selectedPlant?.wateringDays ?? null;
  if (suggestedRecurrenceDays !== lastSuggestedRecurrenceDays) {
    setLastSuggestedRecurrenceDays(suggestedRecurrenceDays);
    if (!hasEditedRecurrence && suggestedRecurrenceDays) setRecurrenceDays(suggestedRecurrenceDays);
  }

  const setRecurrence = (value: number | null) => {
    setRecurrenceDays(value);
    setHasEditedRecurrence(true);
  };

  const openTimePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: dateForTime(reminderHour, reminderMinute),
        mode: 'time',
        is24Hour: true,
        onValueChange: (_event, date) => {
          setReminderHour(date.getHours());
          setReminderMinute(date.getMinutes());
        },
      });
      return;
    }
    setIsIosTimePickerOpen(true);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Dá um título pro lembrete.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await createTask({
        title: title.trim(),
        plantId: selectedPlant?.id ?? null,
        plantName: selectedPlant?.name ?? null,
        plantPhotoUrl: selectedPlant?.photoUrl ?? null,
        category,
        notes: notes.trim() || null,
        recurrenceDays,
        reminderHour,
        reminderMinute,
      });
      requestExactAlarmAccessOnce();
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar o lembrete. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Metrics.spacing.lg }]}
      keyboardShouldPersistTaps="handled"
      bottomOffset={Metrics.spacing.lg}
    >
      <FormField label="Título" value={title} onChangeText={setTitle} placeholder="Regar o Samba" />

      {isPlantLocked && selectedPlant && (
        <View style={styles.field}>
          <Text style={styles.label}>Planta</Text>
          <View style={styles.lockedPlant}>
            <View style={styles.plantAvatar}>
              {selectedPlant.photoUrl ? (
                <Image source={{ uri: selectedPlant.photoUrl }} style={styles.plantAvatarImage} contentFit="cover" />
              ) : (
                <Leaf size={Metrics.icon.normal} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
              )}
            </View>
            <Text style={styles.lockedPlantName}>{selectedPlant.name}</Text>
          </View>
        </View>
      )}

      {!isPlantLocked && plants.length > 0 && (
        <View style={styles.field}>
          <Text style={styles.label}>Planta (opcional)</Text>
          <PlantPickerRow plants={plants} selectedId={plantId} onSelect={setPlantId} />
        </View>
      )}

      <View style={styles.field}>
        <Text style={styles.label}>Categoria</Text>
        <PillSelector
          options={TASK_CATEGORIES.map(({ value, label }) => ({ value, label }))}
          value={category}
          onChange={setCategory}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Repetir?</Text>
        <PillSelector
          options={RECURRENCE_OPTIONS}
          value={recurrenceDays === null ? 'once' : 'repeat'}
          onChange={(mode) =>
            setRecurrence(mode === 'once' ? null : (recurrenceDays ?? selectedPlant?.wateringDays ?? DEFAULT_RECURRENCE_DAYS))
          }
        />

        {recurrenceDays !== null && (
          <View style={styles.stepperRow}>
            <Pressable
              style={styles.stepperButton}
              onPress={() => setRecurrence(Math.max(MIN_RECURRENCE_DAYS, recurrenceDays - 1))}
              hitSlop={8}
            >
              <Minus size={16} color={colors.foreground} strokeWidth={Metrics.icon.strokeWidth} />
            </Pressable>
            <Text style={styles.stepperValue}>{recurrenceDays === 1 ? '1 dia' : `${recurrenceDays} dias`}</Text>
            <Pressable
              style={styles.stepperButton}
              onPress={() => setRecurrence(Math.min(MAX_RECURRENCE_DAYS, recurrenceDays + 1))}
              hitSlop={8}
            >
              <Plus size={16} color={colors.foreground} strokeWidth={Metrics.icon.strokeWidth} />
            </Pressable>
          </View>
        )}

        {recurrenceDays !== null && selectedPlant?.wateringDays && recurrenceDays !== selectedPlant.wateringDays && (
          <Text style={styles.hint}>Recomendado pra essa planta: a cada {selectedPlant.wateringDays} dias</Text>
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Que horas o lembrete deve aparecer?</Text>
        <Pressable style={styles.timeButton} onPress={openTimePicker}>
          <Clock size={18} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
          <Text style={styles.timeButtonText}>
            {`${String(reminderHour).padStart(2, '0')}:${String(reminderMinute).padStart(2, '0')}`}
          </Text>
        </Pressable>

        {Platform.OS === 'ios' && isIosTimePickerOpen && (
          <DateTimePicker
            value={dateForTime(reminderHour, reminderMinute)}
            mode="time"
            is24Hour
            display="spinner"
            onValueChange={(_event, date) => {
              setIsIosTimePickerOpen(false);
              setReminderHour(date.getHours());
              setReminderMinute(date.getMinutes());
            }}
            onDismiss={() => setIsIosTimePickerOpen(false)}
          />
        )}
      </View>

      <FormField
        label="Notas (opcional)"
        value={notes}
        onChangeText={setNotes}
        placeholder="Regar bem a terra, sem encharcar"
        multiline
      />

      <FormError>{error}</FormError>

      <SubmitButton label="Criar lembrete" onPress={handleSubmit} loading={isSubmitting} />
    </KeyboardAwareScrollView>
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
    padding: Metrics.spacing.lg,
  },
  field: {
    marginBottom: Metrics.spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: Metrics.spacing.xs,
  },
  lockedPlant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.sm,
    backgroundColor: colors.card,
    borderRadius: Metrics.radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: Metrics.spacing.sm,
    paddingHorizontal: Metrics.spacing.sm,
    alignSelf: 'flex-start',
  },
  lockedPlantName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
    paddingRight: Metrics.spacing.md,
  },
  plantAvatar: {
    width: 56,
    height: 56,
    borderRadius: Metrics.radius.full,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  plantAvatarImage: {
    width: '100%',
    height: '100%',
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Metrics.spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: Metrics.radius.full,
    paddingVertical: Metrics.spacing.sm,
    paddingHorizontal: Metrics.spacing.md,
    backgroundColor: colors.card,
  },
  timeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.foreground,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.md,
    marginTop: Metrics.spacing.sm,
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: Metrics.radius.full,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.foreground,
    minWidth: 72,
    textAlign: 'center',
  },
  hint: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: Metrics.spacing.xs,
  },
  });
