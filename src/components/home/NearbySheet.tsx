import { ScrollView, StyleSheet, Text } from 'react-native';
import List from 'lucide-react-native/icons/list';
import MapPin from 'lucide-react-native/icons/map-pin';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { formatDistance } from '@/utils';
import { BottomSheet } from '../BottomSheet';
import { Button } from '../Button';
import { CardGroup } from '../CardGroup';
import { InfoChip } from '../InfoChip';
import { ListRow } from '../ListRow';
import { SearchField } from '../SearchField';
import { Thumbnail } from '../Thumbnail';
import type { SelectedPin } from './mapPins';
import type { NearbyPin } from './nearbyPins';
import { pinModel } from './pinModel';

type NearbySheetProps = {
  visible: boolean;
  title: string;
  items: NearbyPin[];
  query: string;
  onChangeQuery: (query: string) => void;
  hiddenCount: number;
  onShowAll: () => void;
  onSelect: (pin: SelectedPin) => void;
  onClose: () => void;
};

function NearbyRow({ item, onSelect }: Readonly<{ item: NearbyPin; onSelect: (pin: SelectedPin) => void }>) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation(['home', 'event']);
  const model = pinModel(item.pin, t);

  return (
    <ListRow
      style={styles.row}
      leading={
        <Thumbnail photoUrl={model.photoUrl} icon={model.icon} color={model.color} />
      }
      eyebrow={model.badgeLabel}
      title={model.title}
      titleTrailing={<InfoChip size="sm" icon={MapPin} value={formatDistance(item.distanceKm)} />}
      subtitle={model.subtitle || undefined}
      onPress={() => onSelect(item.pin)}
    />
  );
}

export function NearbySheet({
  visible,
  title,
  items,
  query,
  onChangeQuery,
  hiddenCount,
  onShowAll,
  onSelect,
  onClose,
}: Readonly<NearbySheetProps>) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('home');
  const emptyMessage = query.trim() ? t('searchEmpty', { query: query.trim() }) : t('nearbyEmpty');

  return (
    <BottomSheet title={title} visible={visible} onClose={onClose}>
      <SearchField value={query} onChangeText={onChangeQuery} placeholder={t('searchMapPlaceholder')} style={styles.search} />
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {items.length > 0 ? (
          <CardGroup>
            {items.map((item) => (
              <NearbyRow key={item.key} item={item} onSelect={onSelect} />
            ))}
          </CardGroup>
        ) : (
          <Text style={styles.empty}>{emptyMessage}</Text>
        )}
        {hiddenCount > 0 ? (
          <Button variant="outline" label={t('showAllPins', { count: hiddenCount })} icon={List} onPress={onShowAll} style={styles.showAll} />
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    search: {
      marginHorizontal: 0,
      marginTop: 0,
      marginBottom: Metrics.spacing.md,
    },
    list: {
      maxHeight: Metrics.layout.heroMaxHeight,
    },
    row: {
      paddingVertical: Metrics.spacing.sm,
    },
    empty: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
      textAlign: 'center',
      paddingVertical: Metrics.spacing.lg,
    },
    showAll: {
      marginTop: Metrics.spacing.md,
    },
  });
