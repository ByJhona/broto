import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { formatDistance } from '@/utils';
import { BottomSheet } from '../BottomSheet';
import { CardGroup } from '../CardGroup';
import { DistancePill } from '../DistancePill';
import { ListRow } from '../ListRow';
import type { SelectedPin } from './mapPins';
import type { NearbyPin } from './nearbyPins';
import { pinModel } from './pinModel';

type NearbySheetProps = {
  visible: boolean;
  title: string;
  items: NearbyPin[];
  onSelect: (pin: SelectedPin) => void;
  onClose: () => void;
};

function NearbyRow({ item, onSelect }: Readonly<{ item: NearbyPin; onSelect: (pin: SelectedPin) => void }>) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation(['home', 'event']);
  const model = pinModel(item.pin, t);
  const Icon = model.icon;

  return (
    <ListRow
      style={styles.row}
      leading={
        <View style={[styles.thumb, { backgroundColor: `${model.color}1F` }]}>
          {model.photoUrl ? (
            <Image source={{ uri: model.photoUrl }} style={styles.thumbImage} contentFit="cover" />
          ) : (
            <Icon size={Metrics.icon.small} color={model.color} strokeWidth={Metrics.icon.strokeWidth} />
          )}
        </View>
      }
      eyebrow={model.badgeLabel}
      title={model.title}
      titleTrailing={<DistancePill label={formatDistance(item.distanceKm)} />}
      subtitle={model.subtitle || undefined}
      onPress={() => onSelect(item.pin)}
    />
  );
}

export function NearbySheet({ visible, title, items, onSelect, onClose }: Readonly<NearbySheetProps>) {
  const styles = useThemedStyles(makeStyles);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>{title}</Text>
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        <CardGroup>
          {items.map((item) => (
            <NearbyRow key={item.key} item={item} onSelect={onSelect} />
          ))}
        </CardGroup>
      </ScrollView>
    </BottomSheet>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    title: {
      ...Typography.title,
      color: colors.foreground,
      marginBottom: Metrics.spacing.md,
    },
    list: {
      maxHeight: Metrics.layout.heroMaxHeight,
    },
    row: {
      paddingVertical: Metrics.spacing.sm,
    },
    thumb: {
      width: Metrics.size.lg,
      height: Metrics.size.lg,
      borderRadius: Metrics.radius.md,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
    },
    thumbImage: {
      width: '100%',
      height: '100%',
    },
  });
