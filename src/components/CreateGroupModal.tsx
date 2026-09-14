import { useState } from 'react';
import { useTranslation } from '@/i18n';
import { usePlantGroups } from '@/hooks';
import type { PlantGroup } from '@/types';
import { PromptModal } from './PromptModal';

type CreateGroupModalProps = {
  visible: boolean;
  onClose: () => void;
  onCreated: (group: PlantGroup) => void;
};

export function CreateGroupModal({ visible, onClose, onCreated }: Readonly<CreateGroupModalProps>) {
  const { t } = useTranslation('group');
  const { addGroup } = usePlantGroups();
  const [nameDraft, setNameDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setNameDraft('');
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setError(t('nameRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      const group = await addGroup(trimmed);
      setNameDraft('');
      setError(null);
      onCreated(group);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('createGroupError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PromptModal
      visible={visible}
      title={t('renameModalTitle')}
      label={t('nameLabel')}
      value={nameDraft}
      onChangeText={setNameDraft}
      placeholder={t('namePlaceholder')}
      error={error}
      submitLabel={t('create')}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
      onCancel={handleClose}
    />
  );
}
