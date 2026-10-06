import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import { Metrics, Opacity, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import type { PlantSummary } from '@/types';
import { BottomSheet } from './BottomSheet';
import { PlantAvatar } from './PlantAvatar';
import { TextButton } from './TextButton';

type PlantPickerSheetProps = {
  visible: boolean;
  title: string;
  emptyMessage: string;
  closeLabel: string;
  plants: PlantSummary[];
  selectedIds?: Set<string>;
  onPressPlant: (plant: PlantSummary) => void;
  onClose: () => void;
};

export function PlantPickerSheet({
  visible,
  title,
  emptyMessage,
  closeLabel,
  plants,
  selectedIds,
  onPressPlant,
  onClose,
}: Readonly<PlantPickerSheetProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);

  return (
    <BottomSheet title={title} visible={visible} onClose={onClose} sheetStyle={styles.sheet}>
      {plants.length === 0 ? (
        <Text style={styles.empty}>{emptyMessage}</Text>
      ) : (
        <ScrollView>
          {plants.map((plant) => {
            const selected = selectedIds?.has(plant.id) ?? false;
            return (
              <Pressable
                key={plant.id}
                accessibilityRole={selectedIds ? 'checkbox' : 'button'}
                accessibilityState={selectedIds ? { checked: selected } : undefined}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                onPress={() => onPressPlant(plant)}
              >
                <PlantAvatar photoUrl={plant.photoUrl} />
                <Text style={styles.name}>{plant.name}</Text>
                {selectedIds ? (
                  <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                    {selected ? <Check size={Metrics.icon.xs} color={colors.leafForeground} strokeWidth={Metrics.icon.stroke.heavy} /> : null}
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      <TextButton label={closeLabel} tone={selectedIds ? 'primary' : 'muted'} onPress={onClose} style={styles.close} />
    </BottomSheet>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    sheet: {
      maxHeight: '70%',
    },
    empty: {
      ...Typography.body,
      color: colors.foreground,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.md,
      paddingVertical: Metrics.spacing.sm,
      borderBottomWidth: Metrics.borderWidth.sm,
      borderBottomColor: colors.border,
    },
    pressed: {
      opacity: Opacity.pressed,
    },
    name: {
      flex: 1,
      ...Typography.headingMedium,
      color: colors.foreground,
    },
    checkbox: {
      width: Metrics.size.xs,
      height: Metrics.size.xs,
      borderRadius: Metrics.radius.full,
      borderWidth: Metrics.borderWidth.lg,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxSelected: {
      backgroundColor: colors.leaf,
      borderColor: colors.leaf,
    },
    close: {
      marginTop: Metrics.spacing.sm,
    },
  });
