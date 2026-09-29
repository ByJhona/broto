import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/i18n';
import { usePlantGroups } from '@/hooks';
import { patchPlantInAllCaches, setPlantGroup } from '@/services';
import type { PlantGroup, PlantSummary } from '@/types';
import { ActionSheet, confirm, Toast } from '@/utils';

function useGroupRename(group: PlantGroup | null) {
  const { t } = useTranslation('group');
  const { renameGroup } = usePlantGroups();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const open = () => {
    if (!group) return;
    setDraft(group.name);
    setError(null);
    setIsOpen(true);
  };

  const save = async () => {
    const name = draft.trim();
    if (!group) return;
    if (!name) {
      setError(t('nameRequired'));
      return;
    }

    setIsSaving(true);
    try {
      await renameGroup({ id: group.id, name });
      setIsOpen(false);
    } catch {
      setError(t('renameError'));
    } finally {
      setIsSaving(false);
    }
  };

  return {
    open,
    modalProps: {
      visible: isOpen,
      value: draft,
      onChangeText: setDraft,
      error,
      isSubmitting: isSaving,
      onSubmit: save,
      onCancel: () => setIsOpen(false),
    },
  };
}

export function useGroupActions(group: PlantGroup | null) {
  const { t } = useTranslation(['group', 'common']);
  const queryClient = useQueryClient();
  const { removeGroup } = usePlantGroups();
  const rename = useGroupRename(group);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const deleteGroup = async () => {
    if (!group) return;
    const confirmed = await confirm(t('deleteGroupTitle'), t('deleteGroupMessage', { count: group.plantCount }), {
      confirmLabel: t('common:delete'),
      destructive: true,
    });
    if (!confirmed) return;

    try {
      await removeGroup(group.id);
    } catch {
      Toast.error(t('deleteGroupError'));
    }
  };

  const togglePlant = async (plant: PlantSummary) => {
    if (!group) return;
    const groupId = plant.groupId === group.id ? null : group.id;

    try {
      await setPlantGroup(plant.id, groupId);
      patchPlantInAllCaches(queryClient, plant.id, { groupId });
      queryClient.invalidateQueries({ queryKey: ['plant-groups'] });
    } catch {
      Toast.error(t('updatePlantGroupError'));
    }
  };

  const openPicker = () => setIsPickerOpen(true);

  const openActions = () => {
    ActionSheet.show(t('editGroupTitle'), [
      { text: t('rename'), onPress: rename.open },
      { text: t('addPlants'), onPress: openPicker },
      { text: t('deleteGroupTitle'), style: 'destructive', onPress: deleteGroup },
      { text: t('common:cancel'), style: 'cancel' },
    ]);
  };

  return {
    openActions,
    openPicker,
    renameModalProps: rename.modalProps,
    pickerProps: { visible: isPickerOpen, onToggle: togglePlant, onClose: () => setIsPickerOpen(false) },
  };
}

export type GroupActions = ReturnType<typeof useGroupActions>;
