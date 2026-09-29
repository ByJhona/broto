import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Leaf from 'lucide-react-native/icons/leaf';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import type { PlantSummary } from '@/types';
import { BottomSheet } from './BottomSheet';

type ExchangePlantPickerModalProps = {
  visible: boolean;
  plants: PlantSummary[];
  onSelect: (plant: PlantSummary) => void;
  onClose: () => void;
};

export function ExchangePlantPickerModal({ visible, plants, onSelect, onClose }: Readonly<ExchangePlantPickerModalProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation(['listing', 'common']);

  return (
    <BottomSheet visible={visible} onClose={onClose} sheetStyle={styles.sheet}>
      <Text style={styles.title}>{t('exchangePlantPickerTitle')}</Text>
      {plants.length === 0 ? (
        <Text style={styles.description}>{t('noPlantsRegistered')}</Text>
      ) : (
        <ScrollView>
          {plants.map((plant) => (
            <Pressable key={plant.id} style={styles.row} onPress={() => onSelect(plant)}>
              <View style={styles.avatar}>
                {plant.photoUrl ? (
                  <Image source={{ uri: plant.photoUrl }} style={styles.avatarImage} contentFit="cover" />
                ) : (
                  <Leaf size={Metrics.icon.normal} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
                )}
              </View>
              <Text style={styles.rowText}>{plant.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      <Pressable style={styles.cancel} onPress={onClose}>
        <Text style={styles.cancelText}>{t('common:cancel')}</Text>
      </Pressable>
    </BottomSheet>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    sheet: {
      maxHeight: '70%',
    },
    title: {
      ...Typography.title,
      color: colors.foreground,
      marginBottom: Metrics.spacing.md,
    },
    description: {
      ...Typography.body,
      color: colors.foreground,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.md,
      paddingVertical: Metrics.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    avatar: {
      width: Metrics.size.lg,
      height: Metrics.size.lg,
      borderRadius: Metrics.radius.full,
      backgroundColor: colors.muted,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    rowText: {
      ...Typography.headingMedium,
      color: colors.foreground,
    },
    cancel: {
      alignItems: 'center',
      paddingVertical: Metrics.spacing.md,
    },
    cancelText: {
      ...Typography.label,
      color: colors.mutedForeground,
    },
  });
