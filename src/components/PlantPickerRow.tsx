import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import type { PlantSummary } from '@/types';
import { PlantAvatar } from './PlantAvatar';

type PlantPickerRowProps = {
  plants: PlantSummary[];
  selectedId: string | null;
  onSelect: (plantId: string | null) => void;
};

export function PlantPickerRow({ plants, selectedId, onSelect }: Readonly<PlantPickerRowProps>) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('plant');

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      <Pressable style={styles.option} onPress={() => onSelect(null)}>
        <PlantAvatar size={Metrics.size.xl} selected={selectedId === null}>
          <Text style={styles.avatarEmptyText}>{t('noneOption')}</Text>
        </PlantAvatar>
      </Pressable>
      {plants.map((plant) => {
        const selected = selectedId === plant.id;
        return (
          <Pressable key={plant.id} style={styles.option} onPress={() => onSelect(plant.id)}>
            <PlantAvatar photoUrl={plant.photoUrl} size={Metrics.size.xl} selected={selected} />
            <Text style={styles.optionText} numberOfLines={1}>
              {plant.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: Metrics.spacing.md,
      paddingRight: Metrics.spacing.md,
    },
    option: {
      alignItems: 'center',
      width: Metrics.size.xxl,
    },
    avatarEmptyText: {
      ...Typography.captionLabel,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
    optionText: {
      ...Typography.caption,
      color: colors.foreground,
      marginTop: Metrics.spacing.xs,
      textAlign: 'center',
    },
  });
