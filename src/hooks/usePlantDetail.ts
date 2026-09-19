import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/i18n';
import { useAuth } from './useAuth';
import { useCareTasks } from './useCareTasks';
import { useCredits } from './useCredits';
import { usePlantGroups } from './usePlantGroups';
import { deletePlant, getPlant, setPlantGroup, updatePlantName } from '@/services';
import { TASK_CATEGORY, type Plant, type PlantGroup, type PlantSummary } from '@/types';
import { Alert, confirm, Toast, type AlertButton } from '@/utils';

function plantPlaceholderData(summary: PlantSummary | undefined): Plant | undefined {
  if (!summary) return undefined;
  return {
    ...summary,
    photoUrls: summary.photoUrl ? [summary.photoUrl] : [],
    groupName: null,
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
}

export function usePlantDetail(id: string | undefined) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation(['plant', 'common']);
  const { user } = useAuth();
  const { credits } = useCredits();
  const {
    tasks: careTasksList,
    isLoading: isCareTasksLoading,
    createTask,
    toggleTask,
    deleteTask,
    refresh: refreshCareTasks,
  } = useCareTasks();
  const { groups } = usePlantGroups();
  const isPremium = credits?.planId === 'premium';

  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);

  const plantsListKey = ['plants', user?.id] as const;

  const { data: plant = null, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['plant', id],
    queryFn: () => getPlant(id!),
    enabled: !!id,
    placeholderData: () =>
      plantPlaceholderData(queryClient.getQueryData<PlantSummary[]>(plantsListKey)?.find((item) => item.id === id)),
  });

  useEffect(() => {
    if (!plant || !isPremium || isCareTasksLoading) return;

    const hasReminder = careTasksList.some(
      (task) => task.plantId === plant.id && task.category === TASK_CATEGORY.GROWTH_CHECK
    );
    if (hasReminder) return;

    createTask({
      title: t('growthCheckTaskTitle', { name: plant.name }),
      plantId: plant.id,
      plantName: plant.name,
      plantPhotoUrl: plant.photoUrls[0] ?? null,
      category: TASK_CATEGORY.GROWTH_CHECK,
      notes: t('growthCheckTaskNotes'),
      recurrenceDays: 14,
    });
  }, [plant, isPremium, isCareTasksLoading, careTasksList, createTask, t]);

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
      setRenameError(t('nameRequired'));
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
      setRenameError(err instanceof Error ? err.message : t('saveNameError'));
    } finally {
      setIsSavingName(false);
    }
  };

  const handleDelete = async () => {
    if (!plant) return;

    const confirmed = await confirm(t('deleteConfirmTitle'), t('deleteConfirmMessage', { name: plant.name }), {
      confirmLabel: t('common:delete'),
      destructive: true,
    });
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deletePlant(plant.id);
      queryClient.removeQueries({ queryKey: ['plant', plant.id] });
      await refreshCareTasks();
      router.replace('/garden');
    } catch (err) {
      setIsDeleting(false);
      Toast.error(err instanceof Error ? err.message : t('deleteError'));
    }
  };

  const handleOpenActions = () => {
    Alert.alert(t('editPlantActionTitle'), undefined, [
      { text: t('renameAction'), onPress: handleOpenRename },
      { text: t('deletePlantAction'), style: 'destructive', onPress: handleDelete },
      { text: t('common:cancel'), style: 'cancel' },
    ]);
  };

  const handleAssignGroup = async (groupId: string | null, groupName: string | null) => {
    if (!plant) return;

    try {
      await setPlantGroup(plant.id, groupId);
      queryClient.setQueryData(['plant', id], (current: Plant | undefined) =>
        current ? { ...current, groupId, groupName } : current
      );
      queryClient.invalidateQueries({ queryKey: ['plant-groups'] });
      queryClient.invalidateQueries({ queryKey: ['plants-by-group'] });
      queryClient.invalidateQueries({ queryKey: ['plants'] });
    } catch (err) {
      Toast.error(err instanceof Error ? err.message : t('groupUpdateError'));
    }
  };

  const handleGroupCreated = (group: PlantGroup) => {
    setIsCreateGroupModalOpen(false);
    handleAssignGroup(group.id, group.name);
  };

  const handleOpenGroupPicker = () => {
    const buttons: AlertButton[] = groups.map((group) => ({
      text: group.name,
      onPress: () => handleAssignGroup(group.id, group.name),
    }));
    buttons.push({ text: t('noGroupOption'), onPress: () => handleAssignGroup(null, null) });
    buttons.push({ text: t('createNewGroupOption'), onPress: () => setIsCreateGroupModalOpen(true) });
    buttons.push({ text: t('common:cancel'), style: 'cancel' });
    Alert.alert(t('groupPickerTitle'), undefined, buttons);
  };

  const setPhotoUrls = (photoUrls: string[]) => {
    queryClient.setQueryData(['plant', id], (current: Plant | undefined) => (current ? { ...current, photoUrls } : current));
  };

  return {
    plant,
    isLoading,
    isPlaceholderData,
    isPremium,
    careTasksList,
    toggleTask,
    deleteTask,
    groups,
    isDeleting,
    isRenameModalOpen,
    nameDraft,
    setNameDraft,
    renameError,
    isSavingName,
    isCreateGroupModalOpen,
    setIsCreateGroupModalOpen,
    handleOpenRename,
    handleSaveName,
    closeRenameModal: () => setIsRenameModalOpen(false),
    handleDelete,
    handleOpenActions,
    handleAssignGroup,
    handleGroupCreated,
    handleOpenGroupPicker,
    setPhotoUrls,
  };
}
