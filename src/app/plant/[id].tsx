import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  Droplet,
  MapPin,
  PawPrint,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Sun,
  Trash2,
  type LucideIcon,
} from 'lucide-react-native';
import { Colors, Metrics } from '@/theme';
import {
  InfoChip,
  LoadingScreen,
  PlantChat,
  PlantGrowthSection,
  PlantPhotoHero,
  PlantRemindersSection,
  SectionTitle,
  SpeciesInfoSection,
  SpeciesInfoSkeleton,
} from '@/components';
import { useCareTasks, useCredits } from '@/hooks';
import { deletePlant, getPlant, getPlantSpeciesInfo } from '@/services';
import type { Plant, PlantSpeciesInfo } from '@/types';
import { confirm, daysBetween, sunLevelLabel, Toast, today } from '@/utils';

const CARE_LEVEL_LABEL: Record<PlantSpeciesInfo['careLevel'], string> = {
  easy: 'Fácil de cuidar',
  moderate: 'Cuidado moderado',
  hard: 'Exige experiência',
};

const CARE_LEVEL_ICON: Record<PlantSpeciesInfo['careLevel'], LucideIcon> = {
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

export default function PlantDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { credits } = useCredits();
  const {
    tasks: careTasksList,
    isLoading: isCareTasksLoading,
    createTask,
    toggleTask,
    refresh: refreshCareTasks,
  } = useCareTasks();
  const isPremium = credits?.planId === 'premium';

  const [plant, setPlant] = useState<Plant | null>(null);
  const [speciesInfo, setSpeciesInfo] = useState<PlantSpeciesInfo | null>(null);
  const [isSpeciesInfoLoading, setIsSpeciesInfoLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getPlant(id).then((result) => {
      if (isMounted) {
        setPlant(result);
        setIsLoading(false);
      }
      if (result?.species) {
        setIsSpeciesInfoLoading(true);
        getPlantSpeciesInfo(result.species, result.commonName).then((info) => {
          if (isMounted) {
            setSpeciesInfo(info);
            setIsSpeciesInfoLoading(false);
          }
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [id]);

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
      await refreshCareTasks();
      router.replace('/garden');
    } catch (err) {
      setIsDeleting(false);
      Toast.error(err instanceof Error ? err.message : 'Não foi possível excluir a planta.');
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!plant) {
    return (
      <View style={styles.centered}>
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
  if (speciesInfo) {
    careStats.push({ key: 'careLevel', icon: CARE_LEVEL_ICON[speciesInfo.careLevel], value: CARE_LEVEL_LABEL[speciesInfo.careLevel] });
    careStats.push({
      key: 'petSafety',
      icon: PawPrint,
      value: speciesInfo.toxicToPets ? 'Não é segura para pets' : 'Segura para pets',
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <Pressable onPress={handleDelete} disabled={isDeleting} hitSlop={8}>
              <Trash2 size={Metrics.icon.normal} color={Colors.destructive} strokeWidth={Metrics.icon.strokeWidth} />
            </Pressable>
          ),
        }}
      />

      <PlantPhotoHero
        plant={plant}
        onPhotoUrlChange={(photoUrl) => setPlant((current) => (current ? { ...current, photoUrl } : current))}
      />

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

        {speciesInfo ? (
          <SpeciesInfoSection info={speciesInfo} />
        ) : isSpeciesInfoLoading ? (
          <SpeciesInfoSkeleton />
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    paddingBottom: Metrics.spacing.xl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  emptyText: {
    color: Colors.mutedForeground,
    fontSize: 15,
  },
  content: {
    padding: Metrics.spacing.lg,
  },
  sinceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.leaf,
    marginBottom: Metrics.spacing.lg,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: Metrics.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Metrics.spacing.md,
    marginBottom: Metrics.spacing.lg,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Metrics.spacing.sm,
  },
});
