import { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import type { EventAttendee } from '@/services';
import { Avatar } from './Avatar';
import { Card } from './Card';
import { ListRow } from './ListRow';
import { SectionTitle } from './SectionTitle';

type EventAttendeesSectionProps = {
  attendees: EventAttendee[] | undefined;
  onPressAttendee: (userId: string) => void;
};

export function EventAttendeesSection({ attendees, onPressAttendee }: Readonly<EventAttendeesSectionProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Card style={styles.section}>
      <SectionTitle>Confirmados</SectionTitle>
      {attendees?.length ? (
        attendees.map((attendee) => (
          <ListRow
            key={attendee.userId}
            style={styles.row}
            leading={<Avatar name={attendee.name ?? 'Alguém'} url={attendee.avatarUrl} size={32} />}
            title={attendee.name ?? 'Alguém'}
            onPress={() => onPressAttendee(attendee.userId)}
          />
        ))
      ) : (
        <Text style={styles.description}>Ninguém confirmou presença ainda.</Text>
      )}
    </Card>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    section: {
      marginBottom: Metrics.spacing.lg,
    },
    description: {
      fontSize: 15,
      lineHeight: 21,
      color: colors.foreground,
    },
    row: {
      paddingVertical: Metrics.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
  });
