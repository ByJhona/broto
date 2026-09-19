import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Leaf from 'lucide-react-native/icons/leaf';
import Plus from 'lucide-react-native/icons/plus';
import { useRouter } from 'expo-router';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { useTranslation } from '@/i18n';
import {
  CreateGroupModal,
  EmptyState,
  GardenRemindersSection,
  IconButton,
  OfflineBanner,
  PlantCard,
  PlantCardSkeleton,
  PlantGroupsSection,
} from '@/components';
import { useCareTasks, useNetworkStatus, usePlantGroups, usePlants } from '@/hooks';
import type { PlantSummary } from '@/types';

const SKELETON_PLACEHOLDERS = [0, 1];

type UngroupedEmptyText = {
  title: string;
  message: string;
};

function ungroupedEmptyText(hasAnyPlants: boolean, t: (key: string) => string): UngroupedEmptyText {
  if (hasAnyPlants) {
    return {
      title: t('allOrganizedTitle'),
      message: t('allOrganizedMessage'),
    };
  }
  return {
    title: t('noPlantsYetTitle'),
    message: t('noPlantsYetMessage'),
  };
}

export default function GardenScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation('garden');
  const { plants, isLoading, refresh } = usePlants();
  const { tasks, toggleTask } = useCareTasks();
  const { groups } = usePlantGroups();
  const { isOffline } = useNetworkStatus();
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const showSkeleton = isLoading && plants.length === 0;
  const ungroupedPlants = plants.filter((plant) => plant.groupId == null);
  const emptyText = ungroupedEmptyText(plants.length > 0, t);

  const handlePullRefresh = async () => {
    setIsPullRefreshing(true);
    await refresh();
    setIsPullRefreshing(false);
  };

  const renderPlantCard = useCallback(({ item }: { item: PlantSummary }) => <PlantCard plant={item} />, []);
  const gardenListHeader = (
    <>
      <PlantGroupsSection groups={groups} onCreateGroup={() => setIsCreateGroupOpen(true)} />
      <GardenRemindersSection tasks={tasks} onToggle={toggleTask} />
    </>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Metrics.spacing.lg }]}>
        <Text style={styles.title}>{t('title')}</Text>
      </View>

      {isOffline ? (
        <View style={styles.banner}>
          <OfflineBanner />
        </View>
      ) : null}

      {showSkeleton ? (
        <FlatList
          contentContainerStyle={styles.list}
          data={SKELETON_PLACEHOLDERS}
          keyExtractor={(item) => `skeleton-${item}`}
          renderItem={() => <PlantCardSkeleton />}
          ListHeaderComponent={gardenListHeader}
        />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={ungroupedPlants}
          keyExtractor={(item) => item.id}
          renderItem={renderPlantCard}
          refreshControl={
            <RefreshControl refreshing={isPullRefreshing} onRefresh={handlePullRefresh} tintColor={colors.leaf} colors={[colors.leaf]} />
          }
          ListHeaderComponent={gardenListHeader}
          ListEmptyComponent={
            <EmptyState icon={Leaf} title={emptyText.title} message={emptyText.message} style={styles.empty} />
          }
        />
      )}

      <IconButton
        size={52}
        backgroundColor={colors.primary}
        elevated
        style={[styles.createButton, { bottom: insets.bottom + Metrics.spacing.lg }]}
        onPress={() => router.push('/garden/add')}
      >
        <Plus size={Metrics.icon.normal} color={colors.white} strokeWidth={Metrics.icon.strokeWidth} />
      </IconButton>

      <CreateGroupModal
        visible={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onCreated={() => setIsCreateGroupOpen(false)}
      />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      ...Metrics.layout.centeredContent,
      paddingHorizontal: Metrics.spacing.lg,
      marginBottom: Metrics.spacing.md,
    },
    banner: {
      ...Metrics.layout.centeredContent,
      paddingHorizontal: Metrics.spacing.lg,
      marginBottom: Metrics.spacing.md,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.foreground,
    },
    empty: {
      ...Metrics.layout.centeredContent,
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: Metrics.spacing.xl,
    },
    list: {
      ...Metrics.layout.centeredContent,
      flexGrow: 1,
      padding: Metrics.spacing.lg,
      gap: Metrics.spacing.md,
    },
    createButton: {
      position: 'absolute',
      right: Metrics.spacing.lg,
    },
  });
