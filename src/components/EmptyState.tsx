import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Colors, Metrics } from '@/theme';

type EmptyStateProps = {
  icon: LucideIcon;
  title?: string;
  message: string;
  style?: StyleProp<ViewStyle>;
};

export function EmptyState({ icon: Icon, title, message, style }: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <Icon size={Metrics.icon.xl} color={Colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.foreground,
    marginTop: Metrics.spacing.md,
  },
  message: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: Metrics.spacing.xs,
  },
});
