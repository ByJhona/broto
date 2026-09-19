export const LISTING_TYPE = {
  DONATION: 'donation',
  EXCHANGE: 'exchange',
  DISCARD: 'discard',
  SALE: 'sale',
} as const;

export type ListingType = (typeof LISTING_TYPE)[keyof typeof LISTING_TYPE];

export const LISTING_STATUS = {
  AVAILABLE: 'available',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type ListingStatus = (typeof LISTING_STATUS)[keyof typeof LISTING_STATUS];

export type PlantListing = {
  id: string;
  userId: string;
  plantId: string | null;
  listingType: ListingType;
  title: string;
  description: string | null;
  photoUrls: string[];
  priceCents: number | null;
  latitude: number;
  longitude: number;
  status: ListingStatus;
  createdAt: string;
  ownerName: string | null;
  ownerAvatarUrl: string | null;
  boostedUntil: string | null;
};
