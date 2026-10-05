import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Leaf from 'lucide-react-native/icons/leaf';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import type { PlantSummary } from '@/types';

type PlantPickerRowProps = {
  plants: PlantSummary[];
  selectedId: string | null;
  onSelect: (plantId: string | null) => void;
};

export function PlantPickerRow({ plants, selectedId, onSelect }: Readonly<PlantPickerRowProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('plant');

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      <Pressable style={styles.option} onPress={() => onSelect(null)}>
        <View style={[styles.avatar, selectedId === null && styles.avatarSelected]}>
          <Text style={styles.avatarEmptyText}>{t('noneOption')}</Text>
        </View>
      </Pressable>
      {plants.map((plant) => {
        const selected = selectedId === plant.id;
        return (
          <Pressable key={plant.id} style={styles.option} onPress={() => onSelect(plant.id)}>
            <View style={[styles.avatar, selected && styles.avatarSelected]}>
              {plant.photoUrl ? (
                <Image source={{ uri: plant.photoUrl }} style={styles.avatarImage} contentFit="cover" />
              ) : (
                <Leaf size={Metrics.icon.normal} color={colors.leaf} strokeWidth={Metrics.icon.stroke.regular} />
              )}
            </View>
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
    avatar: {
      width: Metrics.size.xl,
      height: Metrics.size.xl,
      borderRadius: Metrics.radius.full,
      backgroundColor: colors.muted,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: Metrics.borderWidth.lg,
      borderColor: 'transparent',
      overflow: 'hidden',
    },
    avatarSelected: {
      borderColor: colors.leaf,
    },
    avatarImage: {
      width: '100%',
      height: '100%',
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
