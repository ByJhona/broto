import { Pressable, StyleSheet, Text, View } from 'react-native';
import ListChecks from 'lucide-react-native/icons/list-checks';
import Plus from 'lucide-react-native/icons/plus';
import Trash2 from 'lucide-react-native/icons/trash-2';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';

type MultiSelectHeaderActionsProps = {
  isSelecting: boolean;
  selectedCount: number;
  selectAccessibilityLabel: string;
  onAdd?: () => void;
  onStartSelecting: () => void;
  onCancelSelecting: () => void;
  onConfirmDelete: () => void;
};

export function MultiSelectHeaderActions({
  isSelecting,
  selectedCount,
  selectAccessibilityLabel,
  onAdd,
  onStartSelecting,
  onCancelSelecting,
  onConfirmDelete,
}: Readonly<MultiSelectHeaderActionsProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('common');

  if (isSelecting) {
    const hasSelection = selectedCount > 0;
    return (
      <View style={styles.row}>
        <Pressable onPress={onCancelSelecting} hitSlop={8}>
          <Text style={styles.cancelText}>{t('cancel')}</Text>
        </Pressable>
        <Pressable
          style={[styles.iconButton, hasSelection && styles.deleteButtonActive]}
          onPress={onConfirmDelete}
          disabled={!hasSelection}
          hitSlop={8}
          accessibilityLabel={t('delete')}
        >
          <Trash2 size={Metrics.icon.small} color={hasSelection ? colors.destructive : colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
          {hasSelection ? <Text style={styles.deleteCount}>{selectedCount}</Text> : null}
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Pressable style={styles.iconButton} onPress={onStartSelecting} hitSlop={8} accessibilityLabel={selectAccessibilityLabel}>
        <ListChecks size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
      </Pressable>
      {onAdd ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t('common:a11yAdd')} style={styles.iconButton} onPress={onAdd} hitSlop={8}>
          <Plus size={Metrics.icon.small} color={colors.primary} strokeWidth={Metrics.icon.strokeWidth} />
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
      gap: Metrics.spacing.md,
    },
    iconButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Metrics.spacing.xs,
      width: Metrics.size.sm,
      height: Metrics.size.sm,
      borderRadius: Metrics.radius.full,
      backgroundColor: colors.muted,
    },
    deleteButtonActive: {
      width: undefined,
      paddingHorizontal: Metrics.spacing.sm,
    },
    deleteCount: {
      ...Typography.captionStrong,
      color: colors.destructive,
    },
    cancelText: {
      ...Typography.label,
      color: colors.mutedForeground,
    },
  });
