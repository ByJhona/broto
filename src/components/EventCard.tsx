import type { StyleProp, ViewStyle } from 'react-native';
import MapPin from 'lucide-react-native/icons/map-pin';
import Users from 'lucide-react-native/icons/users';
import { Overlays } from '@/theme';
import { useTranslation } from '@/i18n';
import { isBoostActive } from '@/services';
import { EVENT_STATUS, type PlantEvent } from '@/types';
import { EVENT_COLOR, EVENT_ICON, formatEventDateTime } from '@/utils';
import { FeaturedBadge } from './FeaturedBadge';
import { PhotoBadge, PhotoCard, type PhotoCardMeta } from './PhotoCard';

type Translate = (key: string, options?: Record<string, unknown>) => string;

function eventStatusLabel(event: PlantEvent, t: Translate): string | null {
  if (event.status === EVENT_STATUS.CANCELLED) return t('statusCancelled');
  if (new Date(event.eventDate).getTime() < Date.now()) return t('statusEnded');
  return null;
}

function eventMeta(event: PlantEvent, distanceLabel: string | null, t: Translate): PhotoCardMeta {
  if (distanceLabel) return { icon: MapPin, label: distanceLabel };
  return { icon: Users, label: t('attendeesShort', { count: event.attendeeCount }) };
}

function EventCorner({ event, t }: Readonly<{ event: PlantEvent; t: Translate }>) {
  const statusLabel = eventStatusLabel(event, t);
  if (statusLabel) return <PhotoBadge label={statusLabel} color={Overlays.scrim} />;
  if (isBoostActive(event.boostedUntil)) return <FeaturedBadge compact />;
  return null;
}

type EventCardProps = {
  event: PlantEvent;
  distanceLabel: string | null;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function EventCard({ event, distanceLabel, onPress, style }: Readonly<EventCardProps>) {
  const { t } = useTranslation('event');
  const dateLabel = formatEventDateTime(event.eventDate);
  const meta = eventMeta(event, distanceLabel, t);

  return (
    <PhotoCard
      title={event.title}
      photoUrl={event.photoUrl}
      placeholderIcon={EVENT_ICON}
      placeholderColor={EVENT_COLOR}
      topLeft={<PhotoBadge icon={EVENT_ICON} label={dateLabel} color={EVENT_COLOR} />}
      topRight={<EventCorner event={event} t={t} />}
      meta={meta}
      onPress={onPress}
      accessibilityLabel={[event.title, dateLabel, meta.label].join('. ')}
      recyclingKey={event.id}
      style={style}
    />
  );
}
