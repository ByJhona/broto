import { Pressable, StyleSheet, Text, View } from 'react-native';
import Pencil from 'lucide-react-native/icons/pencil';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';

type PlantsSectionHeaderProps = {
  count: number;
  onEditGroup: (() => void) | null;
};

export function PlantsSectionHeader({ count, onEditGroup }: Readonly<PlantsSectionHeaderProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('group');

  return (
    <View style={styles.row}>
      <Text style={styles.count}>{count === 1 ? t('onePlant') : t('plantsCount', { count })}</Text>
      {onEditGroup ? (
        <Pressable style={styles.editButton} onPress={onEditGroup} hitSlop={Metrics.hitSlop} accessibilityRole="button">
          <Pencil size={Metrics.icon.xs} color={colors.leaf} strokeWidth={Metrics.icon.stroke.regular} />
          <Text style={styles.editText}>{t('editGroupTitle')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: Metrics.spacing.md,
      minHeight: Metrics.size.xs,
    },
    count: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
    },
    editButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.xs,
    },
    editText: {
      ...Typography.label,
      color: colors.leaf,
    },
  });
