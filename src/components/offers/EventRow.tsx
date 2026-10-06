import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Metrics, useThemedStyles } from '@/theme';
import { useTranslation } from '@/i18n';
import { isBoostActive } from '@/services';
import type { PlantEvent } from '@/types';
import { EVENT_COLOR, EVENT_ICON, formatEventDateTime } from '@/utils';
import { FeaturedBadge } from '../FeaturedBadge';
import { ListRow } from '../ListRow';
import { Thumbnail } from '../Thumbnail';
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
  const attendeesLabel = event.attendeeCount == null ? null : t('attendeesShort', { count: event.attendeeCount });
  const subtitle = [formatEventDateTime(event.eventDate), attendeesLabel].filter(Boolean).join(' · ');

  return (
    <ListRow
      variant="card"
      style={styles.row}
      leading={
        <View style={styles.thumbWrapper}>
          <Thumbnail photoUrl={event.photoUrl} icon={EVENT_ICON} color={EVENT_COLOR} size={Metrics.size.xl} />
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
