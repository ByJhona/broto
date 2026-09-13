import { Image, StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useColors } from '@/theme';

type ListingMarkerPinProps = {
  photoUrl?: string | null;
  color: string;
  icon: LucideIcon;
  size?: number;
  highlighted?: boolean;
};

export function ListingMarkerPin({
  photoUrl,
  color,
  icon: Icon,
  size = 40,
  highlighted = false,
}: Readonly<ListingMarkerPinProps>) {
  const colors = useColors();
  const pinSize = highlighted ? size * 1.15 : size;
  const headSize = pinSize * 0.85;
  const tipSize = headSize * 0.36;

  return (
    <View style={[styles.container, { width: pinSize, height: pinSize * 1.3 }]}>
      <View
        style={[
          styles.head,
          {
            width: headSize,
            height: headSize,
            borderRadius: headSize / 2,
            backgroundColor: color,
            borderColor: highlighted ? colors.card : color,
            borderWidth: highlighted ? 4 : 3,
          },
          highlighted ? { shadowColor: color, shadowOpacity: 0.6, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 8 } : null,
        ]}
      >
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.photo} />
        ) : (
          <Icon size={headSize * 0.5} color={colors.white} strokeWidth={1.5} />
        )}
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
    overflow: 'hidden',
    borderWidth: 3,
    zIndex: 2,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  tip: {
    transform: [{ rotate: '45deg' }],
    zIndex: 1,
  },
});
