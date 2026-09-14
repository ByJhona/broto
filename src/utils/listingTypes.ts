import ArrowLeftRight from 'lucide-react-native/icons/arrow-left-right';
import Gift from 'lucide-react-native/icons/gift';
import LifeBuoy from 'lucide-react-native/icons/life-buoy';
import Tag from 'lucide-react-native/icons/tag';
import type { LucideIcon } from 'lucide-react-native';
import { i18n } from '@/i18n';
import { LISTING_STATUS, LISTING_TYPE, type ListingStatus, type ListingType } from '@/types';
import { formatPrice } from './currency';

const LISTING_TYPE_VALUES: ListingType[] = Object.values(LISTING_TYPE);

export const LISTING_TYPE_ICONS: Record<ListingType, LucideIcon> = {
  [LISTING_TYPE.DONATION]: Gift,
  [LISTING_TYPE.EXCHANGE]: ArrowLeftRight,
  [LISTING_TYPE.DISCARD]: LifeBuoy,
  [LISTING_TYPE.SALE]: Tag,
};

export const LISTING_TYPE_COLORS: Record<ListingType, string> = {
  [LISTING_TYPE.DONATION]: '#3B82F6',
  [LISTING_TYPE.EXCHANGE]: '#A855F7',
  [LISTING_TYPE.DISCARD]: '#F59E0B',
  [LISTING_TYPE.SALE]: '#10B981',
};

export function listingTypeLabel(listingType: ListingType): string {
  return i18n.t(`listingTypes:${listingType}`);
}

export function listingTypes(): { value: ListingType; label: string; icon: LucideIcon; color: string }[] {
  return LISTING_TYPE_VALUES.map((value) => ({
    value,
    label: listingTypeLabel(value),
    icon: LISTING_TYPE_ICONS[value],
    color: LISTING_TYPE_COLORS[value],
  }));
}

export function listingShareVerb(listingType: ListingType): string {
  return i18n.t(`listingTypes:shareVerb_${listingType}`);
}

export function listingBadgeLabel(listingType: ListingType, priceCents: number | null): string {
  if (listingType === LISTING_TYPE.SALE && priceCents != null) return formatPrice(priceCents);
  return listingTypeLabel(listingType);
}

export function listingStatusLabel(status: ListingStatus): string | undefined {
  if (status === LISTING_STATUS.AVAILABLE) return undefined;
  return i18n.t(`listingTypes:status_${status}`);
}

export function listingStatusNotice(status: ListingStatus): string | undefined {
  if (status === LISTING_STATUS.AVAILABLE) return undefined;
  return i18n.t(`listingTypes:notice_${status}`);
}
