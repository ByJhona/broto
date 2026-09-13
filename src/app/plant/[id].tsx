import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Droplet from 'lucide-react-native/icons/droplet';
import Leaf from 'lucide-react-native/icons/leaf';
import MapPin from 'lucide-react-native/icons/map-pin';
import PawPrint from 'lucide-react-native/icons/paw-print';
import Pencil from 'lucide-react-native/icons/pencil';
import SignalHigh from 'lucide-react-native/icons/signal-high';
import SignalLow from 'lucide-react-native/icons/signal-low';
import SignalMedium from 'lucide-react-native/icons/signal-medium';
import Sun from 'lucide-react-native/icons/sun';
import type { LucideIcon } from 'lucide-react-native';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import {
  Card,
  EmptyState,
  InfoChip,
  PlantChat,
  PlantGrowthSection,
  PlantPhotoHero,
  PlantRemindersSection,
  PromptModal,
  ScreenContent,
  SectionTitle,
  SkeletonBlock,
  SpeciesInfoSection,
  SpeciesInfoSkeleton,
} from '@/components';
import { useAuth, useCareTasks, useCredits } from '@/hooks';
import { deletePlant, getPlant, updatePlantName } from '@/services';
import type { Plant, PlantSummary } from '@/types';
import { Alert, confirm, daysBetween, sunLevelLabel, Toast, today } from '@/utils';

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
      <ScreenContent>
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
      </ScreenContent>
    </>
  );
}

export default function PlantDetailScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
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

  const { data: plant = null, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['plant', id],
    queryFn: () => getPlant(id!),
    enabled: !!id,
    placeholderData: () => {
      const summary = queryClient.getQueryData<PlantSummary[]>(plantsListKey)?.find((item) => item.id === id);
      if (!summary) return undefined;
      return {
        ...summary,
        photoUrls: summary.photoUrl ? [summary.photoUrl] : [],
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
      plantPhotoUrl: plant.photoUrls[0] ?? null,
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

  const handleOpenActions = () => {
    Alert.alert('Editar planta', undefined, [
      { text: 'Renomear', onPress: handleOpenRename },
      { text: 'Excluir planta', style: 'destructive', onPress: handleDelete },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  if (isLoading && !plant) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + Metrics.spacing.xl }}
      >
        <Stack.Screen options={{ title: '' }} />
        <PlantDetailSkeleton />
      </ScrollView>
    );
  }

  if (!plant) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: '' }} />
        <EmptyState icon={Leaf} message="Planta não encontrada." />
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

  let speciesInfoContent: React.ReactNode = null;
  if (plant.description) {
    speciesInfoContent = (
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
    );
  } else if (isPlaceholderData) {
    speciesInfoContent = <SpeciesInfoSkeleton />;
  }

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + Metrics.spacing.xl }}
      keyboardShouldPersistTaps="handled"
      bottomOffset={Metrics.spacing.lg}
    >
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <Pressable onPress={handleOpenActions} disabled={isDeleting} hitSlop={8}>
              <Pencil size={Metrics.icon.normal} color={colors.foreground} strokeWidth={Metrics.icon.strokeWidth} />
            </Pressable>
          ),
        }}
      />

      <PlantPhotoHero
        plant={plant}
        onPhotoUrlsChange={(photoUrls) =>
          queryClient.setQueryData(['plant', id], (current: Plant | undefined) =>
            current ? { ...current, photoUrls } : current
          )
        }
      />

      <PromptModal
        visible={isRenameModalOpen}
        title="Como você quer chamar essa planta?"
        label="Nome"
        value={nameDraft}
        onChangeText={setNameDraft}
        placeholder="Samba"
        error={renameError}
        submitLabel="Salvar"
        isSubmitting={isSavingName}
        onSubmit={handleSaveName}
        onCancel={() => setIsRenameModalOpen(false)}
      />

      <ScreenContent>
        <Text style={styles.sinceLabel}>{daysWithYouLabel(plant.createdAt)}</Text>

        {careStats.length > 0 ? (
          <Card style={styles.section}>
            <SectionTitle>Cuidados ideais</SectionTitle>
            <View style={styles.chipRow}>
              {careStats.map((stat) => (
                <InfoChip key={stat.key} value={stat.value} icon={stat.icon} />
              ))}
            </View>
          </Card>
        ) : null}

        <PlantRemindersSection plantId={plant.id} tasks={careTasksList} onToggle={toggleTask} />

        <Card style={styles.section}>
          <SectionTitle>Pergunte sobre sua planta</SectionTitle>
          <PlantChat plantId={plant.id} />
        </Card>

        <PlantGrowthSection plant={plant} isPremium={isPremium} />

        {speciesInfoContent}
      </ScreenContent>
    </KeyboardAwareScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
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
    marginBottom: Metrics.spacing.lg,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Metrics.spacing.sm,
  },
  });
