import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import type { ListingType } from '@/types';
import { listingTypes } from '@/utils';
import { GRID_GAP, useGridCardWidth } from '../gridLayout';
import { IconBadge } from '../IconBadge';

type ListingTypePickerProps = {
  value: ListingType;
  onChange: (value: ListingType) => void;
};

export function ListingTypePicker({ value, onChange }: Readonly<ListingTypePickerProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('listingTypes');
  const tileWidth = useGridCardWidth();

  return (
    <View style={styles.grid} accessibilityRole="radiogroup">
      {listingTypes().map(({ value: type, label, icon: Icon, color }) => {
        const isSelected = type === value;
        return (
          <Pressable
            key={type}
            style={[styles.tile, { width: tileWidth }, isSelected && { borderColor: color }]}
            onPress={() => onChange(type)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
          >
            <IconBadge backgroundColor={isSelected ? color : colors.muted}>
              <Icon size={Metrics.icon.small} color={isSelected ? colors.white : color} strokeWidth={Metrics.icon.strokeWidth} />
            </IconBadge>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.hint} numberOfLines={2}>
              {t(`hint_${type}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: GRID_GAP,
    },
    tile: {
      gap: Metrics.spacing.xs,
      padding: Metrics.spacing.md,
      borderRadius: Metrics.radius.lg,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    label: {
      ...Typography.heading,
      color: colors.foreground,
      marginTop: Metrics.spacing.xs,
    },
    hint: {
      ...Typography.caption,
      color: colors.mutedForeground,
    },
  });
