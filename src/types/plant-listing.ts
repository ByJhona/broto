export type ListingType = 'donation' | 'exchange' | 'discard';
export type ListingStatus = 'available' | 'completed' | 'cancelled';

export type PlantListing = {
  id: string;
  userId: string;
  plantId: string | null;
  listingType: ListingType;
  title: string;
  description: string | null;
  photoUrls: string[];
  latitude: number;
  longitude: number;
  status: ListingStatus;
  createdAt: string;
  ownerName: string | null;
  ownerAvatarUrl: string | null;
};
