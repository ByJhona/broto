import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Clock from 'lucide-react-native/icons/clock';
import Leaf from 'lucide-react-native/icons/leaf';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import {
  CardGroup,
  FloatingScreenControls,
  InfoSection,
  ListRow,
  PillSelector,
  PlantPickerRow,
  useScreenTopInset,
} from '@/components';
import { ComposeFooter, COMPOSE_FOOTER_CLEARANCE } from '@/components/compose/ComposeFooter';
import { ComposeTitleBlock } from '@/components/compose/ComposeTitleBlock';
import { PickerRow } from '@/components/compose/PickerRow';
import { RecurrenceStepperRow, RecurrenceToggleRow } from '@/components/task/RecurrenceRows';
import { useCareTasks, usePlants } from '@/hooks';
import { formatTime, useTaskCategories } from '@/utils';
import { TASK_CATEGORY, type PlantSummary, type TaskCategory } from '@/types';
import { useTranslation } from '@/i18n';

const DEFAULT_RECURRENCE_DAYS = 3;
const DEFAULT_REMINDER_HOUR = 9;

function dateForTime(hour: number, minute: number): Date {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

function LockedPlantRow({ plant }: Readonly<{ plant: PlantSummary }>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);

  return (
    <CardGroup>
      <ListRow
        style={styles.plantRow}
        leading={
          <View style={styles.plantThumb}>
            {plant.photoUrl ? (
              <Image source={{ uri: plant.photoUrl }} style={styles.plantThumbImage} contentFit="cover" />
            ) : (
              <Leaf size={Metrics.icon.normal} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
            )}
          </View>
        }
        title={plant.name}
      />
    </CardGroup>
  );
}

export default function NewTaskScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = useScreenTopInset();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{ plantId?: string }>();
  const { createTask } = useCareTasks();
  const { plants } = usePlants();
  const taskCategories = useTaskCategories();
  const { t } = useTranslation('task');
  const isPlantLocked = !!params.plantId;

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [plantId, setPlantId] = useState<string | null>(params.plantId ?? null);
  const [category, setCategory] = useState<TaskCategory>(TASK_CATEGORY.WATERING);
  const [recurrenceDays, setRecurrenceDays] = useState<number | null>(DEFAULT_RECURRENCE_DAYS);
  const [hasEditedRecurrence, setHasEditedRecurrence] = useState(false);
  const [lastSuggestedRecurrenceDays, setLastSuggestedRecurrenceDays] = useState<number | null>(null);
  const [reminderTime, setReminderTime] = useState(() => dateForTime(DEFAULT_REMINDER_HOUR, 0));
  const [isIosTimePickerOpen, setIsIosTimePickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedPlant = plants.find((plant) => plant.id === plantId) ?? null;
  const suggestedRecurrenceDays = selectedPlant?.wateringDays ?? null;
  if (suggestedRecurrenceDays !== lastSuggestedRecurrenceDays) {
    setLastSuggestedRecurrenceDays(suggestedRecurrenceDays);
    if (!hasEditedRecurrence && suggestedRecurrenceDays) setRecurrenceDays(suggestedRecurrenceDays);
  }
  const showRecommendedHint = recurrenceDays !== null && !!suggestedRecurrenceDays && recurrenceDays !== suggestedRecurrenceDays;

  const setRecurrence = (value: number | null) => {
    setRecurrenceDays(value);
    setHasEditedRecurrence(true);
  };

  const handleToggleRepeat = (repeat: boolean) =>
    setRecurrence(repeat ? (recurrenceDays ?? suggestedRecurrenceDays ?? DEFAULT_RECURRENCE_DAYS) : null);

  const openTimePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: reminderTime,
        mode: 'time',
        is24Hour: true,
        onValueChange: (_event, date) => setReminderTime(date),
      });
      return;
    }
    setIsIosTimePickerOpen(true);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError(t('missingTitleError'));
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
        reminderHour: reminderTime.getHours(),
        reminderMinute: reminderTime.getMinutes(),
      });
      router.back();
    } catch (err) {
      console.error(err);
      setError(t('createError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topInset,
            paddingBottom: insets.bottom + COMPOSE_FOOTER_CLEARANCE,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={COMPOSE_FOOTER_CLEARANCE}
      >
        <ComposeTitleBlock
          title={title}
          onChangeTitle={setTitle}
          titleLabel={t('titleLabel')}
          titlePlaceholder={t('titlePlaceholder')}
          description={notes}
          onChangeDescription={setNotes}
          descriptionLabel={t('notesLabel')}
          descriptionPlaceholder={t('notesPlaceholder')}
        />

        {isPlantLocked && selectedPlant ? (
          <InfoSection title={t('plantLabel')}>
            <LockedPlantRow plant={selectedPlant} />
          </InfoSection>
        ) : null}

        {!isPlantLocked && plants.length > 0 ? (
          <InfoSection title={t('plantOptionalLabel')}>
            <PlantPickerRow plants={plants} selectedId={plantId} onSelect={setPlantId} />
          </InfoSection>
        ) : null}

        <InfoSection title={t('categoryLabel')}>
          <PillSelector options={taskCategories.map(({ value, label }) => ({ value, label }))} value={category} onChange={setCategory} />
        </InfoSection>

        <InfoSection title={t('whenLabel')}>
          <CardGroup>
            <PickerRow icon={Clock} color={colors.leaf} eyebrow={t('reminderTimeLabel')} value={formatTime(reminderTime)} onPress={openTimePicker} />
            <RecurrenceToggleRow recurrenceDays={recurrenceDays} onToggleRepeat={handleToggleRepeat} />
            {recurrenceDays === null ? null : <RecurrenceStepperRow recurrenceDays={recurrenceDays} onChangeDays={setRecurrence} />}
          </CardGroup>
          {showRecommendedHint ? <Text style={styles.hint}>{t('recommendedHint', { days: suggestedRecurrenceDays })}</Text> : null}
          {Platform.OS === 'ios' && isIosTimePickerOpen ? (
            <DateTimePicker
              value={reminderTime}
              mode="time"
              is24Hour
              display="spinner"
              onValueChange={(_event, date) => {
                setIsIosTimePickerOpen(false);
                setReminderTime(date);
              }}
              onDismiss={() => setIsIosTimePickerOpen(false)}
            />
          ) : null}
        </InfoSection>
      </KeyboardAwareScrollView>

      <ComposeFooter label={t('createCta')} onPress={handleSubmit} loading={isSubmitting} error={error} />
      <FloatingScreenControls />
    </View>
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
      paddingHorizontal: Metrics.spacing.lg,
    },
    plantRow: {
      paddingVertical: Metrics.spacing.sm,
    },
    plantThumb: {
      width: Metrics.size.lg,
      height: Metrics.size.lg,
      borderRadius: Metrics.radius.md,
      backgroundColor: colors.muted,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    plantThumbImage: {
      width: '100%',
      height: '100%',
    },
    hint: {
      ...Typography.caption,
      color: colors.mutedForeground,
      marginTop: Metrics.spacing.sm,
    },
  });
