import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ListChecks from 'lucide-react-native/icons/list-checks';
import Plus from 'lucide-react-native/icons/plus';
import Trash2 from 'lucide-react-native/icons/trash-2';
import { Metrics, useColors, type ThemeColors } from '@/theme';
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
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
        <Pressable style={styles.iconButton} onPress={onAdd} hitSlop={8}>
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
      gap: 4,
      width: 28,
      height: 28,
      borderRadius: Metrics.radius.full,
      backgroundColor: colors.muted,
    },
    deleteButtonActive: {
      width: undefined,
      paddingHorizontal: Metrics.spacing.sm,
    },
    deleteCount: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.destructive,
    },
    cancelText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.mutedForeground,
    },
  });
