import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import EllipsisVertical from 'lucide-react-native/icons/ellipsis-vertical';
import Folder from 'lucide-react-native/icons/folder';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { useTranslation } from '@/i18n';
import {
  EmptyState,
  GroupPlantPickerModal,
  LoadingScreen,
  PlantCard,
  PlantCardSkeleton,
  PromptModal,
  SubmitButton,
} from '@/components';
import { usePlantGroups, usePlants } from '@/hooks';
import { getPlantsByGroupId, setPlantGroup } from '@/services';
import type { PlantSummary } from '@/types';
import { Alert, confirm, Toast } from '@/utils';

const SKELETON_PLACEHOLDERS = [0, 1];

export default function GroupDetailScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation(['group', 'common']);
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { groups, isLoading: isGroupsLoading, renameGroup, removeGroup } = usePlantGroups();
  const { plants: allPlants } = usePlants();

  const group = groups.find((item) => item.id === id) ?? null;

  const plantsQueryKey = ['plants-by-group', id] as const;
  const {
    data: groupPlants = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: plantsQueryKey,
    queryFn: () => getPlantsByGroupId(id!),
    enabled: !!id,
  });

  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const groupPlantIds = new Set(groupPlants.map((plant) => plant.id));
  const showSkeleton = isLoading && groupPlants.length === 0;

  const handleOpenRename = () => {
    if (!group) return;
    setNameDraft(group.name);
    setRenameError(null);
    setIsRenameOpen(true);
  };

  const handleSaveName = async () => {
    if (!group) return;

    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setRenameError(t('nameRequired'));
      return;
    }

    setIsSavingName(true);
    try {
      await renameGroup({ id: group.id, name: trimmed });
      setIsRenameOpen(false);
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : t('renameError'));
    } finally {
      setIsSavingName(false);
    }
  };

  const handleDelete = async () => {
    if (!group) return;

    const confirmed = await confirm(
      t('deleteGroupTitle'),
      t('deleteGroupMessage', { count: group.plantCount }),
      { confirmLabel: t('common:delete'), destructive: true }
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await removeGroup(group.id);
      router.replace('/garden');
    } catch (err) {
      setIsDeleting(false);
      Toast.error(err instanceof Error ? err.message : t('deleteGroupError'));
    }
  };

  const handleOpenActions = () => {
    Alert.alert(t('editGroupTitle'), undefined, [
      { text: t('rename'), onPress: handleOpenRename },
      { text: t('addPlants'), onPress: () => setIsPickerOpen(true) },
      { text: t('deleteGroupTitle'), style: 'destructive', onPress: handleDelete },
      { text: t('common:cancel'), style: 'cancel' },
    ]);
  };

  const handleTogglePlant = async (plant: PlantSummary) => {
    if (!group) return;

    const isInGroup = groupPlantIds.has(plant.id);
    try {
      await setPlantGroup(plant.id, isInGroup ? null : group.id);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['plant-groups'] });
      queryClient.invalidateQueries({ queryKey: ['plants'] });
    } catch (err) {
      Toast.error(err instanceof Error ? err.message : t('updatePlantGroupError'));
    }
  };

  const renderPlantCard = ({ item }: { item: PlantSummary }) => <PlantCard plant={item} />;

  if (!group) {
    if (isGroupsLoading) {
      return <LoadingScreen />;
    }

    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: '' }} />
        <EmptyState icon={Folder} message={t('groupNotFound')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: group.name,
          headerRight: () => (
            <Pressable onPress={handleOpenActions} disabled={isDeleting} hitSlop={8}>
              <EllipsisVertical size={Metrics.icon.normal} color={colors.foreground} strokeWidth={Metrics.icon.strokeWidth} />
            </Pressable>
          ),
        }}
      />

      {showSkeleton ? (
        <FlatList
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Metrics.spacing.xl }]}
          data={SKELETON_PLACEHOLDERS}
          keyExtractor={(item) => `skeleton-${item}`}
          renderItem={() => <PlantCardSkeleton />}
        />
      ) : (
        <FlatList
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Metrics.spacing.xl }]}
          data={groupPlants}
          keyExtractor={(item) => item.id}
          renderItem={renderPlantCard}
          ListEmptyComponent={
            <View style={styles.empty}>
              <EmptyState icon={Folder} title={t('emptyGroupTitle')} message={t('emptyGroupMessage')} />
              <SubmitButton label={t('addPlants')} onPress={() => setIsPickerOpen(true)} />
            </View>
          }
        />
      )}

      <PromptModal
        visible={isRenameOpen}
        title={t('renameModalTitle')}
        label={t('nameLabel')}
        value={nameDraft}
        onChangeText={setNameDraft}
        placeholder={t('namePlaceholder')}
        error={renameError}
        submitLabel={t('common:save')}
        isSubmitting={isSavingName}
        onSubmit={handleSaveName}
        onCancel={() => setIsRenameOpen(false)}
      />

      <GroupPlantPickerModal
        visible={isPickerOpen}
        plants={allPlants}
        selectedIds={groupPlantIds}
        onToggle={handleTogglePlant}
        onClose={() => setIsPickerOpen(false)}
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
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    list: {
      ...Metrics.layout.centeredContent,
      flexGrow: 1,
      padding: Metrics.spacing.lg,
      gap: Metrics.spacing.md,
    },
    empty: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: Metrics.spacing.xl,
    },
  });
