import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Leaf } from 'lucide-react-native';
import { Colors, Metrics } from '@/theme';
import { FormError, FormField, SubmitButton } from '@/components';
import { useCareTasks, usePlants } from '@/hooks';
import { TASK_CATEGORIES } from '@/utils';
import type { TaskCategory } from '@/types';

const REMINDER_HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export default function NewTaskScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ plantId?: string }>();
  const { createTask } = useCareTasks();
  const { plants } = usePlants();

  const isPlantLocked = !!params.plantId;

  const [title, setTitle] = useState('');
  const [plantId, setPlantId] = useState<string | null>(params.plantId ?? null);
  const [category, setCategory] = useState<TaskCategory>('watering');
  const [recurrenceDays, setRecurrenceDays] = useState('3');
  const [reminderHour, setReminderHour] = useState(9);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedPlant = plants.find((plant) => plant.id === plantId) ?? null;

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
        recurrenceDays: recurrenceDays.trim() ? Number(recurrenceDays) : null,
        reminderHour,
      });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar o lembrete. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <FormField label="Título" value={title} onChangeText={setTitle} placeholder="Regar o Samba" />

        {isPlantLocked ? (
          selectedPlant ? (
            <View style={styles.field}>
              <Text style={styles.label}>Planta</Text>
              <View style={styles.lockedPlant}>
                <View style={styles.plantAvatar}>
                  {selectedPlant.photoUrl ? (
                    <Image source={{ uri: selectedPlant.photoUrl }} style={styles.plantAvatarImage} contentFit="cover" />
                  ) : (
                    <Leaf size={Metrics.icon.normal} color={Colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
                  )}
                </View>
                <Text style={styles.lockedPlantName}>{selectedPlant.name}</Text>
              </View>
            </View>
          ) : null
        ) : plants.length > 0 ? (
          <View style={styles.field}>
            <Text style={styles.label}>Planta (opcional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.plantRow}>
              <Pressable style={styles.plantOption} onPress={() => setPlantId(null)}>
                <View style={[styles.plantAvatar, plantId === null && styles.plantAvatarSelected]}>
                  <Text style={styles.plantAvatarEmptyText}>Nenhuma</Text>
                </View>
              </Pressable>
              {plants.map((plant) => {
                const selected = plantId === plant.id;
                return (
                  <Pressable key={plant.id} style={styles.plantOption} onPress={() => setPlantId(plant.id)}>
                    <View style={[styles.plantAvatar, selected && styles.plantAvatarSelected]}>
                      {plant.photoUrl ? (
                        <Image source={{ uri: plant.photoUrl }} style={styles.plantAvatarImage} contentFit="cover" />
                      ) : (
                        <Leaf size={Metrics.icon.normal} color={Colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
                      )}
                    </View>
                    <Text style={styles.plantOptionText} numberOfLines={1}>
                      {plant.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.field}>
          <Text style={styles.label}>Categoria</Text>
          <View style={styles.pillRow}>
            {TASK_CATEGORIES.map((item) => {
              const selected = category === item.value;
              return (
                <Pressable
                  key={item.value}
                  style={[styles.pill, selected && styles.pillSelected]}
                  onPress={() => setCategory(item.value)}
                >
                  <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <FormField
          label="Repetir a cada quantos dias? (vazio = só uma vez)"
          value={recurrenceDays}
          onChangeText={setRecurrenceDays}
          placeholder="3"
          keyboardType="number-pad"
        />

        <View style={styles.field}>
          <Text style={styles.label}>Que horas o lembrete deve aparecer?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hourRow}>
            {REMINDER_HOURS.map((hour) => {
              const selected = reminderHour === hour;
              return (
                <Pressable
                  key={hour}
                  style={[styles.hourPill, selected && styles.pillSelected]}
                  onPress={() => setReminderHour(hour)}
                >
                  <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{`${hour}h`}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Metrics.spacing.lg,
  },
  field: {
    marginBottom: Metrics.spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: Metrics.spacing.xs,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Metrics.spacing.xs,
  },
  plantRow: {
    flexDirection: 'row',
    gap: Metrics.spacing.md,
    paddingRight: Metrics.spacing.md,
  },
  lockedPlant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Metrics.radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Metrics.spacing.sm,
    paddingHorizontal: Metrics.spacing.sm,
    alignSelf: 'flex-start',
  },
  lockedPlantName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.foreground,
    paddingRight: Metrics.spacing.md,
  },
  plantOption: {
    alignItems: 'center',
    width: 64,
  },
  plantAvatar: {
    width: 56,
    height: 56,
    borderRadius: Metrics.radius.full,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  plantAvatarSelected: {
    borderColor: Colors.primary,
  },
  plantAvatarImage: {
    width: '100%',
    height: '100%',
  },
  plantAvatarEmptyText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  plantOptionText: {
    fontSize: 12,
    color: Colors.foreground,
    marginTop: Metrics.spacing.xs,
    textAlign: 'center',
  },
  pill: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: Metrics.radius.full,
    paddingVertical: 8,
    paddingHorizontal: Metrics.spacing.md,
    backgroundColor: Colors.white,
  },
  hourRow: {
    flexDirection: 'row',
    gap: Metrics.spacing.xs,
    paddingRight: Metrics.spacing.md,
  },
  hourPill: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: Metrics.radius.full,
    paddingVertical: 8,
    paddingHorizontal: Metrics.spacing.sm,
    backgroundColor: Colors.white,
    minWidth: 44,
    alignItems: 'center',
  },
  pillSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.foreground,
  },
  pillTextSelected: {
    color: Colors.primaryForeground,
  },
});
