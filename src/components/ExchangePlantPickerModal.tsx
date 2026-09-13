import { useMemo } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Leaf from 'lucide-react-native/icons/leaf';
import { Metrics, Overlays, useColors, type ThemeColors } from '@/theme';
import type { PlantSummary } from '@/types';

type ExchangePlantPickerModalProps = {
  visible: boolean;
  plants: PlantSummary[];
  onSelect: (plant: PlantSummary) => void;
  onClose: () => void;
};

export function ExchangePlantPickerModal({ visible, plants, onSelect, onClose }: Readonly<ExchangePlantPickerModalProps>) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + Metrics.spacing.lg }]}>
          <Text style={styles.title}>Qual planta você quer oferecer?</Text>
          {plants.length === 0 ? (
            <Text style={styles.description}>Você ainda não tem plantas cadastradas.</Text>
          ) : (
            <ScrollView>
              {plants.map((plant) => (
                <Pressable key={plant.id} style={styles.row} onPress={() => onSelect(plant)}>
                  <View style={styles.avatar}>
                    {plant.photoUrl ? (
                      <Image source={{ uri: plant.photoUrl }} style={styles.avatarImage} />
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
            <Text style={styles.cancelText}>Cancelar</Text>
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
      fontSize: 15,
      fontWeight: '600',
      color: colors.foreground,
    },
    cancel: {
      alignItems: 'center',
      paddingVertical: Metrics.spacing.md,
    },
    cancelText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.mutedForeground,
    },
  });
