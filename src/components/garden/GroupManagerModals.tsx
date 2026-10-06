import { useTranslation } from '@/i18n';
import type { PlantSummary } from '@/types';
import { PlantPickerSheet } from '../PlantPickerSheet';
import { PromptModal } from '../PromptModal';
import type { GroupActions } from './useGroupActions';

type GroupManagerModalsProps = {
  actions: GroupActions;
  plants: PlantSummary[];
  groupId: string | null;
};

export function GroupManagerModals({ actions, plants, groupId }: Readonly<GroupManagerModalsProps>) {
  const { t } = useTranslation(['group', 'common']);
  const selectedIds = new Set(plants.filter((plant) => plant.groupId === groupId).map((plant) => plant.id));

  return (
    <>
      <PromptModal
        {...actions.renameModalProps}
        title={t('renameModalTitle')}
        label={t('nameLabel')}
        placeholder={t('namePlaceholder')}
        submitLabel={t('common:save')}
      />
      <PlantPickerSheet
        {...actions.pickerProps}
        title={t('pickerTitle')}
        emptyMessage={t('noPlantsRegistered')}
        closeLabel={t('done')}
        plants={plants}
        selectedIds={selectedIds}
      />
    </>
  );
}
