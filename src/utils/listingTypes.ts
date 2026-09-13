import ArrowLeftRight from 'lucide-react-native/icons/arrow-left-right';
import Gift from 'lucide-react-native/icons/gift';
import LifeBuoy from 'lucide-react-native/icons/life-buoy';
import Tag from 'lucide-react-native/icons/tag';
import type { LucideIcon } from 'lucide-react-native';
import { LISTING_STATUS, LISTING_TYPE, type ListingStatus, type ListingType } from '@/types';
import { formatPrice } from './currency';

export const LISTING_TYPES: { value: ListingType; label: string; icon: LucideIcon; color: string }[] = [
  { value: LISTING_TYPE.DONATION, label: 'Doação', icon: Gift, color: '#3B82F6' },
  { value: LISTING_TYPE.EXCHANGE, label: 'Troca', icon: ArrowLeftRight, color: '#A855F7' },
  { value: LISTING_TYPE.DISCARD, label: 'Resgate', icon: LifeBuoy, color: '#F59E0B' },
  { value: LISTING_TYPE.SALE, label: 'Venda', icon: Tag, color: '#10B981' },
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
  [LISTING_TYPE.DONATION]: 'Estou doando',
  [LISTING_TYPE.EXCHANGE]: 'Quero trocar',
  [LISTING_TYPE.DISCARD]: 'Preciso me desfazer de',
  [LISTING_TYPE.SALE]: 'Estou vendendo',
};

export function listingBadgeLabel(listingType: ListingType, priceCents: number | null): string {
  if (listingType === LISTING_TYPE.SALE && priceCents != null) return formatPrice(priceCents);
  return LISTING_TYPE_LABELS[listingType];
}

export const LISTING_STATUS_LABELS: Partial<Record<ListingStatus, string>> = {
  [LISTING_STATUS.COMPLETED]: 'Concluída',
  [LISTING_STATUS.CANCELLED]: 'Cancelada',
  [LISTING_STATUS.EXPIRED]: 'Expirada',
};

export const LISTING_STATUS_NOTICES: Partial<Record<ListingStatus, string>> = {
  [LISTING_STATUS.COMPLETED]: 'Essa oferta já foi concluída.',
  [LISTING_STATUS.CANCELLED]: 'Essa oferta foi cancelada.',
  [LISTING_STATUS.EXPIRED]: 'Essa oferta expirou.',
};
