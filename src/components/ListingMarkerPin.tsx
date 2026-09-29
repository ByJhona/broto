import { StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Metrics, useColors } from '@/theme';

type ListingMarkerPinProps = {
  color: string;
  icon: LucideIcon;
  size?: number;
};

export function ListingMarkerPin({ color, icon: Icon, size = Metrics.size.md }: Readonly<ListingMarkerPinProps>) {
  const colors = useColors();
  const headSize = size * 0.85;
  const tipSize = headSize * 0.36;

  return (
    <View style={[styles.container, { width: size, height: size * 1.3 }]}>
      <View
        style={[
          styles.head,
          { width: headSize, height: headSize, borderRadius: headSize / 2, backgroundColor: color },
        ]}
      >
        <Icon size={headSize * 0.5} color={colors.white} strokeWidth={1.5} />
      </View>
      <View style={[styles.tip, { width: tipSize, height: tipSize, backgroundColor: color, marginTop: -tipSize / 2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  head: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  tip: {
    transform: [{ rotate: '45deg' }],
    zIndex: 1,
  },
});
