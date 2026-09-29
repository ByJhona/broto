import { Pressable, StyleSheet, Text } from 'react-native';
import Plus from 'lucide-react-native/icons/plus';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import type { PlantGroup } from '@/types';
import { FilterChipRow } from '../FilterChipRow';

export const ALL_PLANTS = 'all';

type GroupFilterRowProps = {
  groups: PlantGroup[];
  value: string;
  onChange: (value: string) => void;
  onCreateGroup: () => void;
};

export function GroupFilterRow({ groups, value, onChange, onCreateGroup }: Readonly<GroupFilterRowProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('garden');
  const options = [
    { value: ALL_PLANTS, label: t('allPlantsFilter') },
    ...groups.map((group) => ({ value: group.id, label: group.name })),
  ];

  return (
    <FilterChipRow
      options={options}
      value={value}
      onChange={onChange}
      trailing={
        <Pressable style={styles.addChip} onPress={onCreateGroup} accessibilityRole="button">
          <Plus size={Metrics.chip.md.iconSize} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
          <Text style={styles.addChipText}>{t('newGroupChip')}</Text>
        </Pressable>
      }
    />
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    addChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.chip.md.gap,
      borderRadius: Metrics.radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
      paddingVertical: Metrics.chip.md.paddingVertical - 1,
      paddingHorizontal: Metrics.chip.md.paddingHorizontal - 1,
    },
    addChipText: {
      ...Typography.label,
      color: colors.mutedForeground,
    },
  });
