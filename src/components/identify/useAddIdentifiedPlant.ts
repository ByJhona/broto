import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/i18n';
import { useAuth, usePlants } from '@/hooks';
import { checkNewlyEarnedBadge } from '@/services';
import type { Badge, PlantCandidate, PlantSpeciesInfo } from '@/types';
import { requireLogin } from '@/utils';
import { suggestedWateringDays } from '../species/speciesLabels';

function defaultNickname(candidate: PlantCandidate | undefined): string {
  if (!candidate) return '';
  return candidate.commonName ?? candidate.scientificName;
}

export function useAddIdentifiedPlant(candidate: PlantCandidate | undefined, speciesInfo: PlantSpeciesInfo | null) {
  const router = useRouter();
  const { t } = useTranslation('identify');
  const { session, user } = useAuth();
  const { addPlant } = usePlants();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newBadge, setNewBadge] = useState<Badge | null>(null);
  const [addedPlantId, setAddedPlantId] = useState<string | null>(null);

  const open = () => {
    if (!requireLogin(router, !!session, t('loginRequiredMessage'))) return;
    setName(defaultNickname(candidate));
    setError(null);
    setIsOpen(true);
  };

  const submit = async () => {
    if (!candidate) return;
    if (!name.trim()) {
      setError(t('missingNicknameError'));
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const earnedBadge = user?.id ? await checkNewlyEarnedBadge(user.id, candidate.scientificName) : null;
      const plant = await addPlant({
        name: name.trim(),
        species: candidate.scientificName,
        commonName: candidate.commonName,
        wateringDays: speciesInfo ? suggestedWateringDays(speciesInfo.wateringDaysMin, speciesInfo.wateringDaysMax) : null,
        photoUrl: candidate.imageUrl ?? speciesInfo?.referencePhotos[0]?.url ?? null,
      });

      setIsOpen(false);
      if (earnedBadge) {
        setAddedPlantId(plant.id);
        setNewBadge(earnedBadge);
      } else {
        router.replace(`/plant/${plant.id}`);
      }
    } catch {
      setError(t('saveError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const claimBadge = () => {
    setNewBadge(null);
    router.replace(user?.id ? `/profile/${user.id}` : `/plant/${addedPlantId}`);
  };

  const closeBadge = () => {
    setNewBadge(null);
    router.replace(`/plant/${addedPlantId}`);
  };

  return {
    open,
    promptProps: {
      visible: isOpen,
      value: name,
      onChangeText: setName,
      error,
      isSubmitting,
      onSubmit: submit,
      onCancel: () => setIsOpen(false),
    },
    badgeProps: { badge: newBadge, onClaim: claimBadge, onClose: closeBadge },
  };
}
