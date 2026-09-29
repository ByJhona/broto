import { Text, View } from 'react-native';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Metrics, useColors, useThemedStyles } from '@/theme';
import { DistancePill } from '../DistancePill';
import { makeRowStyles } from './styles';

export function DistanceTrailing({ distanceLabel }: Readonly<{ distanceLabel: string | null }>) {
  const colors = useColors();
  const styles = useThemedStyles(makeRowStyles);
  return (
    <View style={styles.trailingColumn}>
      <DistancePill label={distanceLabel} />
      <ChevronRight size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
    </View>
  );
}

export function StatusTrailing({ statusLabel }: Readonly<{ statusLabel?: string }>) {
  const colors = useColors();
  const styles = useThemedStyles(makeRowStyles);
  return (
    <View style={styles.trailingColumn}>
      {statusLabel ? (
        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>{statusLabel}</Text>
        </View>
      ) : null}
      <ChevronRight size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
    </View>
  );
}
