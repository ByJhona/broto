import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Check from 'lucide-react-native/icons/check';
import Leaf from 'lucide-react-native/icons/leaf';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import type { PlantSummary } from '@/types';
import { BottomSheet } from './BottomSheet';

type GroupPlantPickerModalProps = {
  visible: boolean;
  plants: PlantSummary[];
  selectedIds: Set<string>;
  onToggle: (plant: PlantSummary) => void;
  onClose: () => void;
};

export function GroupPlantPickerModal({
  visible,
  plants,
  selectedIds,
  onToggle,
  onClose,
}: Readonly<GroupPlantPickerModalProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('group');

  return (
    <BottomSheet visible={visible} onClose={onClose} sheetStyle={styles.sheet}>
      <Text style={styles.title}>{t('pickerTitle')}</Text>
      {plants.length === 0 ? (
        <Text style={styles.description}>{t('noPlantsRegistered')}</Text>
      ) : (
        <ScrollView>
          {plants.map((plant) => {
            const selected = selectedIds.has(plant.id);
            return (
              <Pressable key={plant.id} style={styles.row} onPress={() => onToggle(plant)}>
                <View style={styles.avatar}>
                  {plant.photoUrl ? (
                    <Image source={{ uri: plant.photoUrl }} style={styles.avatarImage} contentFit="cover" />
                  ) : (
                    <Leaf size={Metrics.icon.normal} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
                  )}
                </View>
                <Text style={styles.rowText}>{plant.name}</Text>
                <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                  {selected ? <Check size={Metrics.icon.xs} color={colors.leafForeground} strokeWidth={2.5} /> : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      <Pressable style={styles.done} onPress={onClose}>
        <Text style={styles.doneText}>{t('done')}</Text>
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
      flex: 1,
      ...Typography.headingMedium,
      color: colors.foreground,
    },
    checkbox: {
      width: Metrics.size.xs,
      height: Metrics.size.xs,
      borderRadius: Metrics.radius.full,
      borderWidth: 2,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxSelected: {
      backgroundColor: colors.leaf,
      borderColor: colors.leaf,
    },
    done: {
      alignItems: 'center',
      paddingVertical: Metrics.spacing.md,
    },
    doneText: {
      ...Typography.labelStrong,
      color: colors.primary,
    },
  });
