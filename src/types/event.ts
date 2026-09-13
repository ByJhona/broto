export const EVENT_STATUS = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
} as const;

export type EventStatus = (typeof EVENT_STATUS)[keyof typeof EVENT_STATUS];

export type PlantEvent = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  photoUrl: string | null;
  eventDate: string;
  latitude: number;
  longitude: number;
  status: EventStatus;
  createdAt: string;
  ownerName: string | null;
  ownerAvatarUrl: string | null;
  attendeeCount: number;
  isAttending: boolean;
};
