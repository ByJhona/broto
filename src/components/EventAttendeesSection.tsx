import { StyleSheet, Text } from 'react-native';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import type { EventAttendee } from '@/services';
import { useTranslation } from '@/i18n';
import { Avatar } from './Avatar';
import { CardGroup } from './CardGroup';
import { InfoSection } from './InfoSection';
import { ListRow } from './ListRow';

type EventAttendeesSectionProps = {
  attendees: EventAttendee[] | undefined;
  onPressAttendee: (userId: string) => void;
};

export function EventAttendeesSection({ attendees, onPressAttendee }: Readonly<EventAttendeesSectionProps>) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation(['event', 'common']);
  const someone = t('common:someone');

  return (
    <InfoSection title={t('confirmedSectionTitle')}>
      {attendees?.length ? (
        <CardGroup>
          {attendees.map((attendee) => (
            <ListRow
              key={attendee.userId}
              style={styles.row}
              leading={<Avatar name={attendee.name ?? someone} url={attendee.avatarUrl} size={Metrics.size.sm} />}
              title={attendee.name ?? someone}
              onPress={() => onPressAttendee(attendee.userId)}
            />
          ))}
        </CardGroup>
      ) : (
        <Text style={styles.emptyText}>{t('noAttendeesYet')}</Text>
      )}
    </InfoSection>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      paddingVertical: Metrics.spacing.sm,
    },
    emptyText: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
    },
  });
