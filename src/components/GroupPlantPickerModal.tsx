import { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Check from 'lucide-react-native/icons/check';
import Leaf from 'lucide-react-native/icons/leaf';
import { Metrics, Overlays, useColors, type ThemeColors } from '@/theme';
import { useTranslation } from '@/i18n';
import type { PlantSummary } from '@/types';

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
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation('group');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + Metrics.spacing.lg }]}>
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
                      {selected ? <Check size={14} color={colors.primaryForeground} strokeWidth={2.5} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          <Pressable style={styles.done} onPress={onClose}>
            <Text style={styles.doneText}>{t('done')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: Overlays.scrim,
    },
    sheet: {
      maxHeight: '70%',
      backgroundColor: colors.background,
      borderTopLeftRadius: Metrics.radius.lg,
      borderTopRightRadius: Metrics.radius.lg,
      padding: Metrics.spacing.lg,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.foreground,
      marginBottom: Metrics.spacing.md,
    },
    description: {
      fontSize: 15,
      lineHeight: 21,
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
      width: 44,
      height: 44,
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
      fontSize: 15,
      fontWeight: '600',
      color: colors.foreground,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: Metrics.radius.full,
      borderWidth: 2,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    done: {
      alignItems: 'center',
      paddingVertical: Metrics.spacing.md,
    },
    doneText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primary,
    },
  });
