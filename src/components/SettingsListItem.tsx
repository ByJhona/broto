import { Pressable, StyleSheet, Text, View } from 'react-native';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Colors, Metrics } from '@/theme';
import type { SettingsItem } from '@/types';

type SettingsListItemProps = SettingsItem & {
  isLast?: boolean;
};

export function SettingsListItem({ icon: Icon, label, onPress, isLast }: SettingsListItemProps) {
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
        <Icon size={Metrics.icon.normal} color={Colors.foreground} strokeWidth={Metrics.icon.strokeWidth} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <ChevronRight size={Metrics.icon.small} color={Colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Metrics.spacing.md,
    paddingHorizontal: Metrics.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  itemLast: {
    borderBottomWidth: 0,
  },
  itemPressed: {
    backgroundColor: Colors.muted,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.sm,
  },
  label: {
    fontSize: 15,
    color: Colors.foreground,
  },
});
