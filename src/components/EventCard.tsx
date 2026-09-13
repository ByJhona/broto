import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Users from 'lucide-react-native/icons/users';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { EVENT_COLOR, EVENT_ICON, formatEventDateTime } from '@/utils';
import { EVENT_STATUS, type PlantEvent } from '@/types';
import { StatusBadge } from './StatusBadge';

const EVENT_CARD_WIDTH = 220;

function eventStatusLabel(event: PlantEvent, isPast: boolean): string | null {
  if (event.status === EVENT_STATUS.CANCELLED) return 'Cancelado';
  if (isPast) return 'Encerrado';
  return null;
}

type EventCardProps = {
  event: PlantEvent;
  distanceLabel?: string | null;
  onPress: () => void;
};

export function EventCard({ event, distanceLabel, onPress }: Readonly<EventCardProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const Icon = EVENT_ICON;
  const attendeesLabel = event.attendeeCount === 1 ? '1 confirmado' : `${event.attendeeCount} confirmados`;
  const metaLine = [attendeesLabel, distanceLabel].filter(Boolean).join(' · ');
  // eslint-disable-next-line react-hooks/purity -- reading the wall clock to check if the event date already passed
  const isPast = new Date(event.eventDate).getTime() < Date.now();
  const statusLabel = eventStatusLabel(event, isPast);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {event.photoUrl ? (
        <Image source={{ uri: event.photoUrl }} style={styles.photo} contentFit="cover" />
      ) : (
        <View style={[styles.photo, styles.photoPlaceholder]}>
          <Icon size={28} color={EVENT_COLOR} strokeWidth={Metrics.icon.strokeWidth} />
        </View>
      )}

      {statusLabel ? <StatusBadge label={statusLabel} /> : null}

      <View style={styles.body}>
        <Text style={styles.date}>{formatEventDateTime(event.eventDate)}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>
        <View style={styles.metaRow}>
          <Users size={12} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
          <Text style={styles.metaText}>{metaLine}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      width: EVENT_CARD_WIDTH,
      backgroundColor: colors.card,
      borderRadius: Metrics.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    photo: {
      width: '100%',
      height: 100,
      backgroundColor: colors.muted,
    },
    photoPlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    body: {
      padding: Metrics.spacing.sm,
      gap: 2,
    },
    date: {
      fontSize: 12,
      fontWeight: '700',
      color: EVENT_COLOR,
    },
    title: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.foreground,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    metaText: {
      fontSize: 12,
      color: colors.mutedForeground,
    },
  });
