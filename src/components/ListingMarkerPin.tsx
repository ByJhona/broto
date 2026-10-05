import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import type { LucideIcon } from 'lucide-react-native';
import { Metrics, useColors } from '@/theme';

const HEAD_RATIO = 0.85;
const TIP_RATIO = 0.36;
const ICON_RATIO = 0.5;

function pinGeometry(size: number) {
  const headSize = size * HEAD_RATIO;
  const tipSize = headSize * TIP_RATIO;
  return { headSize, tipSize, height: headSize + tipSize * Math.SQRT1_2 };
}

export function markerPinHeight(size: number): number {
  return pinGeometry(size).height;
}

type ListingMarkerPinProps = {
  color: string;
  icon: LucideIcon;
  size?: number;
  photoUrl?: string | null;
  onReady?: () => void;
};

export function ListingMarkerPin({ color, icon: Icon, size = Metrics.size.md, photoUrl, onReady }: Readonly<ListingMarkerPinProps>) {
  const colors = useColors();
  const { headSize, tipSize, height } = pinGeometry(size);
  const headStyle = { width: headSize, height: headSize, borderRadius: headSize / 2, backgroundColor: color };

  return (
    <View style={[styles.container, { width: size, height }]}>
      {photoUrl ? (
        <View style={[styles.head, headStyle, styles.photoHead]}>
          <Image
            source={{ uri: photoUrl }}
            style={[styles.photo, { borderRadius: headSize / 2 }]}
            contentFit="cover"
            cachePolicy="memory-disk"
            onDisplay={onReady}
            onError={onReady}
          />
        </View>
      ) : (
        <View style={[styles.head, headStyle]} onLayout={onReady}>
          <Icon size={headSize * ICON_RATIO} color={colors.white} strokeWidth={Metrics.icon.stroke.regular} />
        </View>
      )}
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
    zIndex: Metrics.zIndex.top,
  },
  photoHead: {
    padding: Metrics.borderWidth.xl,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  tip: {
    transform: [{ rotate: '45deg' }],
    zIndex: Metrics.zIndex.raised,
  },
});
