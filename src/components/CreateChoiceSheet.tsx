import { StyleSheet, Text } from 'react-native';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import type { ListingType } from '@/types';
import { EVENT_COLOR, EVENT_ICON, listingTypes } from '@/utils';
import { BottomSheet } from './BottomSheet';
import { CardGroup } from './CardGroup';
import { IconBadge } from './IconBadge';
import { ListRow } from './ListRow';
import { TextButton } from './TextButton';

type CreateChoiceSheetProps = {
  visible: boolean;
  onCreateListing: (listingType: ListingType) => void;
  onCreateEvent: () => void;
  onClose: () => void;
};

export function CreateChoiceSheet({ visible, onCreateListing, onCreateEvent, onClose }: Readonly<CreateChoiceSheetProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation(['home', 'listingTypes', 'common']);
  const chevron = <ChevronRight size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.stroke.regular} />;
  const EventIcon = EVENT_ICON;

  return (
    <BottomSheet title={t('createChoiceTitle')} visible={visible} onClose={onClose}>

      <Text style={styles.sectionLabel}>{t('newListingTitle')}</Text>
      <CardGroup style={styles.group}>
        {listingTypes().map(({ value, label, icon: Icon, color }) => (
          <ListRow
            key={value}
            style={styles.row}
            leading={
              <IconBadge backgroundColor={color}>
                <Icon size={Metrics.icon.small} color={colors.white} strokeWidth={Metrics.icon.stroke.regular} />
              </IconBadge>
            }
            title={label}
            subtitle={t(`listingTypes:hint_${value}`)}
            trailing={chevron}
            onPress={() => onCreateListing(value)}
          />
        ))}
      </CardGroup>

      <CardGroup style={styles.group}>
        <ListRow
          style={styles.row}
          leading={
            <IconBadge backgroundColor={EVENT_COLOR}>
              <EventIcon size={Metrics.icon.small} color={colors.white} strokeWidth={Metrics.icon.stroke.regular} />
            </IconBadge>
          }
          title={t('newEventTitle')}
          subtitle={t('newEventSubtitle')}
          trailing={chevron}
          onPress={onCreateEvent}
        />
      </CardGroup>

      <TextButton label={t('common:cancel')} onPress={onClose} />
    </BottomSheet>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    sectionLabel: {
      ...Typography.captionLabel,
      color: colors.mutedForeground,
      marginBottom: Metrics.spacing.sm,
    },
    group: {
      marginBottom: Metrics.spacing.md,
    },
    row: {
      paddingVertical: Metrics.spacing.sm,
    },
  });
