import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { Metrics, useThemedStyles } from '@/theme';
import { useTranslation } from '@/i18n';
import { isBoostActive } from '@/services';
import type { PlantEvent } from '@/types';
import { EVENT_COLOR, EVENT_ICON, formatEventDateTime } from '@/utils';
import { FeaturedBadge } from '../FeaturedBadge';
import { ListRow } from '../ListRow';
import { makeRowStyles } from './styles';

export type EventRowData = Pick<PlantEvent, 'title' | 'photoUrl' | 'eventDate' | 'boostedUntil'> &
  Partial<Pick<PlantEvent, 'attendeeCount'>>;

type EventRowProps = {
  event: EventRowData;
  trailing: ReactNode;
  onPress: () => void;
};

export function EventRow({ event, trailing, onPress }: Readonly<EventRowProps>) {
  const styles = useThemedStyles(makeRowStyles);
  const { t } = useTranslation('event');
  const EventIcon = EVENT_ICON;
  const attendeesLabel = event.attendeeCount == null ? null : t('attendeesShort', { count: event.attendeeCount });
  const subtitle = [formatEventDateTime(event.eventDate), attendeesLabel].filter(Boolean).join(' · ');

  return (
    <ListRow
      variant="card"
      style={styles.row}
      leading={
        <View style={styles.thumbWrapper}>
          {event.photoUrl ? (
            <Image source={{ uri: event.photoUrl }} style={styles.thumb} contentFit="cover" />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder]}>
              <EventIcon size={Metrics.icon.small} color={EVENT_COLOR} strokeWidth={Metrics.icon.stroke.regular} />
            </View>
          )}
          {isBoostActive(event.boostedUntil) ? <FeaturedBadge compact style={styles.thumbBadge} /> : null}
        </View>
      }
      title={event.title}
      subtitle={subtitle}
      trailing={trailing}
      onPress={onPress}
    />
  );
}
