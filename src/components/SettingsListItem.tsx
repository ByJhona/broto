import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import type { SettingsItem } from '@/types';

type SettingsListItemProps = SettingsItem & {
  isLast?: boolean;
};

export function SettingsListItem({ icon: Icon, label, onPress, isLast }: Readonly<SettingsListItemProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        isLast && styles.itemLast,
        pressed && styles.itemPressed,
      ]}
    >
      <View style={styles.left}>
        <Icon size={Metrics.icon.normal} color={colors.foreground} strokeWidth={Metrics.icon.strokeWidth} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <ChevronRight size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Metrics.spacing.md,
    paddingHorizontal: Metrics.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemLast: {
    borderBottomWidth: 0,
  },
  itemPressed: {
    backgroundColor: colors.muted,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.sm,
  },
  label: {
    fontSize: 15,
    color: colors.foreground,
  },
  });
