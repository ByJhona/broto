import { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Plus from 'lucide-react-native/icons/plus';
import { useRouter } from 'expo-router';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { CareStreakBadge, CreateGroupModal, IconButton, OfflineBanner, PageTitle, PlantCard, PlantCardSkeleton } from '@/components';
import { GRID_COLUMNS, GRID_GAP, GRID_PADDING, useGridCardWidth } from '@/components/gridLayout';
import { nextCareByPlant } from '@/components/garden/careSchedule';
import { GardenEmptyState } from '@/components/garden/GardenEmptyState';
import { GroupManagerModals } from '@/components/garden/GroupManagerModals';
import { ALL_PLANTS, GroupFilterRow } from '@/components/garden/GroupFilterRow';
import { PlantsSectionHeader } from '@/components/garden/PlantsSectionHeader';
import { TodayCareSection } from '@/components/garden/TodayCareSection';
import { useGroupActions } from '@/components/garden/useGroupActions';
import { useCareTasks, useNetworkStatus, usePlantGroups, usePlants, usePullToRefresh } from '@/hooks';
import type { PlantGroup, PlantSummary } from '@/types';
import { today } from '@/utils';

const SKELETON_PLACEHOLDERS = [0, 1, 2, 3];

export default function GardenScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('garden');
  const { plants, isLoading, refresh: refreshPlants } = usePlants();
  const { tasks, toggleTask, deleteTask, refresh: refreshTasks } = useCareTasks();
  const { groups, refresh: refreshGroups } = usePlantGroups();
  const { isOffline } = useNetworkStatus();
  const cardWidth = useGridCardWidth();
  const [selectedGroupId, setSelectedGroupId] = useState(ALL_PLANTS);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const { isRefreshing, handleRefresh } = usePullToRefresh(() =>
    Promise.all([refreshPlants(), refreshTasks(), refreshGroups()])
  );

  const activeGroup = groups.find((group) => group.id === selectedGroupId) ?? null;
  const groupActions = useGroupActions(activeGroup);
  const visiblePlants = activeGroup ? plants.filter((plant) => plant.groupId === activeGroup.id) : plants;
  const hasPlantTools = plants.length > 0 || groups.length > 0;
  const showSkeleton = isLoading && plants.length === 0;

  const careByPlant = useMemo(() => nextCareByPlant(tasks, today()), [tasks]);
  const cardStyle = useMemo(() => ({ width: cardWidth }), [cardWidth]);
  const renderPlantCard = useCallback(
    ({ item }: { item: PlantSummary }) => <PlantCard plant={item} care={careByPlant.get(item.id) ?? null} style={cardStyle} />,
    [careByPlant, cardStyle]
  );

  const handleGroupCreated = (group: PlantGroup) => {
    setIsCreateGroupOpen(false);
    setSelectedGroupId(group.id);
  };

  const listHeader = (
    <>
      <TodayCareSection tasks={tasks} onToggle={toggleTask} onDelete={deleteTask} />
      {hasPlantTools ? (
        <>
          <GroupFilterRow
            groups={groups}
            value={activeGroup?.id ?? ALL_PLANTS}
            onChange={setSelectedGroupId}
            onCreateGroup={() => setIsCreateGroupOpen(true)}
          />
          <PlantsSectionHeader count={visiblePlants.length} onEditGroup={activeGroup ? groupActions.openActions : null} />
        </>
      ) : null}
    </>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Metrics.spacing.lg }]}>
        <PageTitle size="headline" style={styles.title}>{t('title')}</PageTitle>
        <CareStreakBadge />
      </View>

      {isOffline ? (
        <View style={styles.banner}>
          <OfflineBanner />
        </View>
      ) : null}

      {showSkeleton ? (
        <FlatList
          key="skeleton"
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.column}
          numColumns={GRID_COLUMNS}
          data={SKELETON_PLACEHOLDERS}
          keyExtractor={(item) => `skeleton-${item}`}
          renderItem={() => <PlantCardSkeleton style={cardStyle} />}
          ListHeaderComponent={listHeader}
        />
      ) : (
        <FlatList
          key="plants"
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.column}
          numColumns={GRID_COLUMNS}
          data={visiblePlants}
          keyExtractor={(item) => item.id}
          renderItem={renderPlantCard}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.leaf} colors={[colors.leaf]} />
          }
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <GardenEmptyState isGroupSelected={activeGroup !== null} onAddPlantsToGroup={groupActions.openPicker} />
          }
        />
      )}

      <IconButton
        accessibilityLabel={t('addPlantTitle')}
        size={Metrics.size.xl}
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
        onCreated={handleGroupCreated}
      />
      <GroupManagerModals actions={groupActions} plants={plants} groupId={activeGroup?.id ?? null} />
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Metrics.spacing.md,
      paddingHorizontal: GRID_PADDING,
      marginBottom: Metrics.spacing.md,
    },
    banner: {
      ...Metrics.layout.centeredContent,
      paddingHorizontal: GRID_PADDING,
      marginBottom: Metrics.spacing.md,
    },
    title: {
      flexShrink: 1,
      ...Typography.headline,
      color: colors.foreground,
    },
    list: {
      ...Metrics.layout.centeredContent,
      flexGrow: 1,
      paddingHorizontal: GRID_PADDING,
      paddingTop: Metrics.spacing.sm,
      paddingBottom: Metrics.size.xl + Metrics.spacing.lg * 2,
      gap: GRID_GAP,
    },
    column: {
      gap: GRID_GAP,
    },
    createButton: {
      position: 'absolute',
      right: GRID_PADDING,
    },
  });
