export type PlantEvent = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  photoUrl: string | null;
  eventDate: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  ownerName: string | null;
  ownerAvatarUrl: string | null;
  attendeeCount: number;
  isAttending: boolean;
};
