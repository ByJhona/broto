import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Droplet from 'lucide-react-native/icons/droplet';
import MapPin from 'lucide-react-native/icons/map-pin';
import PawPrint from 'lucide-react-native/icons/paw-print';
import SignalHigh from 'lucide-react-native/icons/signal-high';
import SignalLow from 'lucide-react-native/icons/signal-low';
import SignalMedium from 'lucide-react-native/icons/signal-medium';
import Sun from 'lucide-react-native/icons/sun';
import Trash2 from 'lucide-react-native/icons/trash-2';
import type { LucideIcon } from 'lucide-react-native';
import { Metrics, Overlays, useColors, type ThemeColors } from '@/theme';
import {
  FormError,
  FormField,
  InfoChip,
  PlantChat,
  PlantGrowthSection,
  PlantPhotoHero,
  PlantRemindersSection,
  SectionTitle,
  SkeletonBlock,
  SpeciesInfoSection,
  SubmitButton,
} from '@/components';
import { useAuth, useCareTasks, useCredits } from '@/hooks';
import { deletePlant, getPlant, updatePlantName } from '@/services';
import type { Plant, PlantSummary } from '@/types';
import { confirm, daysBetween, sunLevelLabel, Toast, today } from '@/utils';

const CARE_LEVEL_LABEL: Record<NonNullable<Plant['careLevel']>, string> = {
  easy: 'Fácil de cuidar',
  moderate: 'Cuidado moderado',
  hard: 'Exige experiência',
};

const CARE_LEVEL_ICON: Record<NonNullable<Plant['careLevel']>, LucideIcon> = {
  easy: SignalLow,
  moderate: SignalMedium,
  hard: SignalHigh,
};

function daysWithYouLabel(createdAt: string): string {
  const days = daysBetween(createdAt.slice(0, 10), today());
  if (days <= 0) return 'Adicionada hoje';
  if (days === 1) return 'Com você há 1 dia';
  return `Com você há ${days} dias`;
}

type StatTile = {
  key: string;
  value: string;
  icon: LucideIcon;
};

function PlantDetailSkeleton() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <>
      <View style={styles.heroSkeleton} />
      <View style={styles.content}>
        <SkeletonBlock width={140} height={13} style={styles.skeletonGap} />

        <View style={styles.section}>
          <View style={styles.chipRow}>
            <SkeletonBlock width={150} height={26} radius={Metrics.radius.full} />
            <SkeletonBlock width={110} height={26} radius={Metrics.radius.full} />
          </View>
        </View>

        <View style={styles.section}>
          <SkeletonBlock width={130} height={14} style={styles.skeletonGap} />
          <SkeletonBlock height={48} radius={Metrics.radius.md} />
        </View>

        <View style={styles.section}>
          <SkeletonBlock width={180} height={14} style={styles.skeletonGap} />
          <SkeletonBlock height={80} radius={Metrics.radius.md} />
        </View>

        <View style={styles.section}>
          <SkeletonBlock width={150} height={14} style={styles.skeletonGap} />
          <SkeletonBlock height={100} radius={Metrics.radius.md} />
        </View>
      </View>
    </>
  );
}

export default function PlantDetailScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { credits } = useCredits();
  const {
    tasks: careTasksList,
    isLoading: isCareTasksLoading,
    createTask,
    toggleTask,
    refresh: refreshCareTasks,
  } = useCareTasks();
  const isPremium = credits?.planId === 'premium';

  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isSavingName, setIsSavingName] = useState(false);

  const plantsListKey = ['plants', user?.id] as const;

  const { data: plant = null, isLoading } = useQuery({
    queryKey: ['plant', id],
    queryFn: () => getPlant(id!),
    enabled: !!id,
    placeholderData: () => {
      const summary = queryClient.getQueryData<PlantSummary[]>(plantsListKey)?.find((item) => item.id === id);
      if (!summary) return undefined;
      return {
        ...summary,
        origin: null,
        description: null,
        wateringDescription: null,
        careLevel: null,
        toxicToPets: null,
        toxicToPetsNotes: null,
        toxicToHumans: null,
        toxicToHumansNotes: null,
        funFacts: null,
        commonProblems: null,
      };
    },
  });

  useEffect(() => {
    if (!plant || !isPremium || isCareTasksLoading) return;

    const hasReminder = careTasksList.some((task) => task.plantId === plant.id && task.category === 'growth_check');
    if (hasReminder) return;

    createTask({
      title: `Analisar ${plant.name}`,
      plantId: plant.id,
      plantName: plant.name,
      plantPhotoUrl: plant.photoUrl,
      category: 'growth_check',
      notes: 'Tire uma foto pra IA acompanhar a evolução dessa planta.',
      recurrenceDays: 14,
    });
  }, [plant, isPremium, isCareTasksLoading, careTasksList, createTask]);

  const handleOpenRename = () => {
    if (!plant) return;
    setNameDraft(plant.name);
    setRenameError(null);
    setIsRenameModalOpen(true);
  };

  const handleSaveName = async () => {
    if (!plant) return;

    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setRenameError('Dá um nome pra sua planta.');
      return;
    }

    setIsSavingName(true);
    try {
      await updatePlantName(plant.id, trimmed);
      queryClient.setQueryData(['plant', id], (current: Plant | undefined) =>
        current ? { ...current, name: trimmed } : current
      );
      queryClient.setQueryData<PlantSummary[]>(plantsListKey, (current = []) =>
        current.map((item) => (item.id === plant.id ? { ...item, name: trimmed } : item))
      );
      setIsRenameModalOpen(false);
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : 'Não foi possível salvar o nome.');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleDelete = async () => {
    if (!plant) return;

    const confirmed = await confirm(
      'Excluir planta',
      `Tem certeza que quer excluir "${plant.name}"? Essa ação não pode ser desfeita.`,
      { confirmLabel: 'Excluir', destructive: true }
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deletePlant(plant.id);
      queryClient.removeQueries({ queryKey: ['plant', plant.id] });
      await refreshCareTasks();
      router.replace('/garden');
    } catch (err) {
      setIsDeleting(false);
      Toast.error(err instanceof Error ? err.message : 'Não foi possível excluir a planta.');
    }
  };

  if (isLoading && !plant) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Stack.Screen options={{ title: '' }} />
        <PlantDetailSkeleton />
      </ScrollView>
    );
  }

  if (!plant) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: '' }} />
        <Text style={styles.emptyText}>Planta não encontrada.</Text>
      </View>
    );
  }

  const careStats: StatTile[] = [];
  if (plant.wateringDays != null) {
    careStats.push({ key: 'watering', icon: Droplet, value: `Regar a cada ${plant.wateringDays} dias` });
  }
  if (plant.sunLevel != null) {
    careStats.push({ key: 'light', icon: Sun, value: sunLevelLabel(plant.sunLevel) });
  }
  if (plant.origin) careStats.push({ key: 'origin', icon: MapPin, value: plant.origin });
  if (plant.careLevel) {
    careStats.push({ key: 'careLevel', icon: CARE_LEVEL_ICON[plant.careLevel], value: CARE_LEVEL_LABEL[plant.careLevel] });
  }
  if (plant.toxicToPets != null) {
    careStats.push({
      key: 'petSafety',
      icon: PawPrint,
      value: plant.toxicToPets ? 'Não é segura para pets' : 'Segura para pets',
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <Pressable onPress={handleDelete} disabled={isDeleting} hitSlop={8}>
              <Trash2 size={Metrics.icon.normal} color={colors.destructive} strokeWidth={Metrics.icon.strokeWidth} />
            </Pressable>
          ),
        }}
      />

      <PlantPhotoHero
        plant={plant}
        onPhotoUrlChange={(photoUrl) =>
          queryClient.setQueryData(['plant', id], (current: Plant | undefined) =>
            current ? { ...current, photoUrl } : current
          )
        }
        onEditName={handleOpenRename}
      />

      <Modal
        visible={isRenameModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRenameModalOpen(false)}
      >
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Como você quer chamar essa planta?</Text>
            <FormField label="Nome" value={nameDraft} onChangeText={setNameDraft} placeholder="Samba" autoFocus />
            <FormError>{renameError}</FormError>
            <SubmitButton label="Salvar" onPress={handleSaveName} loading={isSavingName} />
            <Pressable
              style={styles.modalCancel}
              onPress={() => setIsRenameModalOpen(false)}
              disabled={isSavingName}
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <View style={styles.content}>
        <Text style={styles.sinceLabel}>{daysWithYouLabel(plant.createdAt)}</Text>

        {careStats.length > 0 ? (
          <View style={styles.section}>
            <SectionTitle>Cuidados ideais</SectionTitle>
            <View style={styles.chipRow}>
              {careStats.map((stat) => (
                <InfoChip key={stat.key} value={stat.value} icon={stat.icon} />
              ))}
            </View>
          </View>
        ) : null}

        <PlantRemindersSection plantId={plant.id} tasks={careTasksList} onToggle={toggleTask} />

        <View style={styles.section}>
          <SectionTitle>Pergunte sobre sua planta</SectionTitle>
          <PlantChat plantId={plant.id} />
        </View>

        <PlantGrowthSection plant={plant} isPremium={isPremium} />

        {plant.description ? (
          <SpeciesInfoSection
            info={{
              description: plant.description,
              wateringDescription: plant.wateringDescription,
              toxicToPets: plant.toxicToPets ?? false,
              toxicToPetsNotes: plant.toxicToPetsNotes,
              toxicToHumans: plant.toxicToHumans ?? false,
              toxicToHumansNotes: plant.toxicToHumansNotes,
              funFacts: plant.funFacts ?? [],
              commonProblems: plant.commonProblems ?? [],
            }}
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingBottom: Metrics.spacing.xl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: 15,
  },
  content: {
    padding: Metrics.spacing.lg,
  },
  heroSkeleton: {
    width: '100%',
    height: 260,
    backgroundColor: colors.muted,
  },
  skeletonGap: {
    marginBottom: Metrics.spacing.sm,
  },
  sinceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.leaf,
    marginBottom: Metrics.spacing.lg,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: Metrics.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Metrics.spacing.md,
    marginBottom: Metrics.spacing.lg,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Metrics.spacing.sm,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Overlays.scrim,
    padding: Metrics.spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: Metrics.radius.lg,
    padding: Metrics.spacing.lg,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: Metrics.spacing.md,
  },
  modalCancel: {
    alignItems: 'center',
    marginTop: Metrics.spacing.sm,
    padding: Metrics.spacing.sm,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  });
