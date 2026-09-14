import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Stack, useLocalSearchParams } from 'expo-router';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
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
  CreateGroupModal,
  EmptyState,
  InfoChip,
  ListRow,
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
import { usePlantDetail } from '@/hooks';
import { type Plant } from '@/types';
import { daysBetween, sunLevelLabel, today } from '@/utils';

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

function buildCareStats(plant: Plant): StatTile[] {
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
  return careStats;
}

type Styles = ReturnType<typeof makeStyles>;

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

type PlantCareStatsCardProps = {
  careStats: StatTile[];
  styles: Styles;
};

function PlantCareStatsCard({ careStats, styles }: Readonly<PlantCareStatsCardProps>) {
  if (careStats.length === 0) return null;
  return (
    <Card style={styles.section}>
      <SectionTitle>Cuidados ideais</SectionTitle>
      <View style={styles.chipRow}>
        {careStats.map((stat) => (
          <InfoChip key={stat.key} value={stat.value} icon={stat.icon} />
        ))}
      </View>
    </Card>
  );
}

type PlantSpeciesInfoProps = {
  plant: Plant;
  isPlaceholderData: boolean;
};

function PlantSpeciesInfo({ plant, isPlaceholderData }: Readonly<PlantSpeciesInfoProps>) {
  if (plant.description) {
    return (
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
  }
  if (isPlaceholderData) return <SpeciesInfoSkeleton />;
  return null;
}

export default function PlantDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = usePlantDetail(id);

  if (detail.isLoading && !detail.plant) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + Metrics.spacing.xl }}>
        <Stack.Screen options={{ title: '' }} />
        <PlantDetailSkeleton />
      </ScrollView>
    );
  }

  if (!detail.plant) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: '' }} />
        <EmptyState icon={Leaf} message="Planta não encontrada." />
      </View>
    );
  }

  const { plant } = detail;
  const careStats = buildCareStats(plant);

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
            <Pressable onPress={detail.handleOpenActions} disabled={detail.isDeleting} hitSlop={8}>
              <Pencil size={Metrics.icon.normal} color={colors.foreground} strokeWidth={Metrics.icon.strokeWidth} />
            </Pressable>
          ),
        }}
      />

      <PlantPhotoHero plant={plant} onPhotoUrlsChange={detail.setPhotoUrls} />

      <PromptModal
        visible={detail.isRenameModalOpen}
        title="Como você quer chamar essa planta?"
        label="Nome"
        value={detail.nameDraft}
        onChangeText={detail.setNameDraft}
        placeholder="Samba"
        error={detail.renameError}
        submitLabel="Salvar"
        isSubmitting={detail.isSavingName}
        onSubmit={detail.handleSaveName}
        onCancel={detail.closeRenameModal}
      />

      <CreateGroupModal
        visible={detail.isCreateGroupModalOpen}
        onClose={() => detail.setIsCreateGroupModalOpen(false)}
        onCreated={detail.handleGroupCreated}
      />

      <ScreenContent>
        <Text style={styles.sinceLabel}>{daysWithYouLabel(plant.createdAt)}</Text>

        <Card style={styles.section}>
          <ListRow
            eyebrow="Grupo"
            title={plant.groupName ?? 'Nenhum grupo'}
            trailing={<ChevronRight size={Metrics.icon.normal} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />}
            onPress={detail.handleOpenGroupPicker}
          />
        </Card>

        <PlantCareStatsCard careStats={careStats} styles={styles} />

        <PlantRemindersSection plantId={plant.id} tasks={detail.careTasksList} onToggle={detail.toggleTask} />

        <Card style={styles.section}>
          <SectionTitle>Pergunte sobre sua planta</SectionTitle>
          <PlantChat plantId={plant.id} />
        </Card>

        <PlantGrowthSection plant={plant} isPremium={detail.isPremium} />

        <PlantSpeciesInfo plant={plant} isPlaceholderData={detail.isPlaceholderData} />
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
