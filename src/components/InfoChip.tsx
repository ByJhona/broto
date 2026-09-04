import { StyleSheet, Text, View } from 'react-native';
import { Colors, Metrics } from '@/theme';
import type { LucideIcon } from 'lucide-react-native';

type InfoChipProps = {
  value: string;
  icon: LucideIcon;
};

export function InfoChip({ value, icon: Icon }: InfoChipProps) {
  return (
    <View style={styles.chip}>
      <Icon size={16} color={Colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
      <Text style={styles.chipText}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.xs,
    backgroundColor: Colors.muted,
    borderRadius: Metrics.radius.full,
    paddingVertical: Metrics.spacing.sm,
    paddingHorizontal: Metrics.spacing.md,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.foreground,
  },
});
