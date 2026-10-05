import { Text, View } from 'react-native';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Metrics, useColors, useThemedStyles } from '@/theme';
import { makeRowStyles } from './styles';

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
      <ChevronRight size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.stroke.regular} />
    </View>
  );
}
