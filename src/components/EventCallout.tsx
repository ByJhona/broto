import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { EVENT_COLOR, EVENT_ICON, formatEventDateTime } from '@/utils';
import type { PlantEvent } from '@/types';
import { ListRow } from './ListRow';

type EventCalloutProps = {
  event: PlantEvent;
  distanceLabel?: string | null;
  onPress: () => void;
};

export function EventCallout({ event, distanceLabel, onPress }: Readonly<EventCalloutProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const Icon = EVENT_ICON;
  const attendeesLabel = event.attendeeCount === 1 ? '1 confirmado' : `${event.attendeeCount} confirmados`;
  const subtitleParts = [formatEventDateTime(event.eventDate), attendeesLabel, distanceLabel].filter(Boolean);
  const subtitle = subtitleParts.join(' · ');

  return (
    <ListRow
      variant="card"
      onPress={onPress}
      leading={
        event.photoUrl ? (
          <Image source={{ uri: event.photoUrl }} style={styles.photo} contentFit="cover" />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Icon size={20} color={EVENT_COLOR} strokeWidth={Metrics.icon.strokeWidth} />
          </View>
        )
      }
      title={event.title}
      subtitle={subtitle}
      trailing={<ChevronRight size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />}
    />
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    photo: {
      width: 48,
      height: 48,
      borderRadius: Metrics.radius.md,
      backgroundColor: colors.muted,
    },
    photoPlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
