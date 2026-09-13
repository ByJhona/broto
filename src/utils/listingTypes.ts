import ArrowLeftRight from 'lucide-react-native/icons/arrow-left-right';
import Gift from 'lucide-react-native/icons/gift';
import LifeBuoy from 'lucide-react-native/icons/life-buoy';
import type { LucideIcon } from 'lucide-react-native';
import type { ListingType } from '@/types';

export const LISTING_TYPES: { value: ListingType; label: string; icon: LucideIcon; color: string }[] = [
  { value: 'donation', label: 'Doação', icon: Gift, color: '#3B82F6' },
  { value: 'exchange', label: 'Troca', icon: ArrowLeftRight, color: '#A855F7' },
  { value: 'discard', label: 'Resgate', icon: LifeBuoy, color: '#F59E0B' },
];

export const LISTING_TYPE_ICONS: Record<ListingType, LucideIcon> = Object.fromEntries(
  LISTING_TYPES.map((item) => [item.value, item.icon])
) as Record<ListingType, LucideIcon>;

export const LISTING_TYPE_COLORS: Record<ListingType, string> = Object.fromEntries(
  LISTING_TYPES.map((item) => [item.value, item.color])
) as Record<ListingType, string>;

export const LISTING_TYPE_LABELS: Record<ListingType, string> = Object.fromEntries(
  LISTING_TYPES.map((item) => [item.value, item.label])
) as Record<ListingType, string>;

export const LISTING_SHARE_VERB: Record<ListingType, string> = {
  donation: 'Estou doando',
  exchange: 'Quero trocar',
  discard: 'Preciso me desfazer de',
};
