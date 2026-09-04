import { StyleSheet, Text, View } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { Colors, Metrics } from '@/theme';

type OfflineBannerProps = {
  message?: string;
};

export function OfflineBanner({ message = 'Sem conexão — mostrando dados salvos.' }: OfflineBannerProps) {
  return (
    <View style={styles.container}>
      <WifiOff size={Metrics.icon.small} color={Colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.xs,
    backgroundColor: Colors.muted,
    borderRadius: Metrics.radius.md,
    paddingVertical: Metrics.spacing.sm,
    paddingHorizontal: Metrics.spacing.md,
    marginHorizontal: Metrics.spacing.lg,
  },
  text: {
    flex: 1,
    fontSize: 13,
    color: Colors.mutedForeground,
  },
});
