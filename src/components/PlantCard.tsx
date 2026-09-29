import { memo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import BellOff from 'lucide-react-native/icons/bell-off';
import Leaf from 'lucide-react-native/icons/leaf';
import { useTranslation } from '@/i18n';
import type { PlantSummary } from '@/types';
import { CATEGORY_ICONS } from '@/utils';
import { plantCareLabel, type PlantCareStatus } from './garden/careSchedule';
import { type MetaTone } from './MetaRow';
import { PhotoCard, PhotoCardSkeleton } from './PhotoCard';

function careTone(care: PlantCareStatus | null): MetaTone {
  if (care && care.daysUntil < 0) return 'alert';
  if (care?.daysUntil === 0) return 'leaf';
  return 'muted';
}

type PlantCardProps = {
  plant: PlantSummary;
  care: PlantCareStatus | null;
  style?: StyleProp<ViewStyle>;
};

export const PlantCard = memo(function PlantCard({ plant, care, style }: Readonly<PlantCardProps>) {
  const router = useRouter();
  const { t } = useTranslation('garden');
  const careLabel = plantCareLabel(care, t);

  return (
    <PhotoCard
      title={plant.name}
      photoUrl={plant.photoUrl}
      placeholderIcon={Leaf}
      meta={{ icon: care ? CATEGORY_ICONS[care.category] : BellOff, label: careLabel, tone: careTone(care) }}
      onPress={() => router.push(`/plant/${plant.id}`)}
      accessibilityLabel={`${plant.name}. ${careLabel}`}
      recyclingKey={plant.id}
      style={style}
    />
  );
});

export const PlantCardSkeleton = PhotoCardSkeleton;
