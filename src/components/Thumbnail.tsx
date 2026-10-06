import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import type { LucideIcon } from 'lucide-react-native';
import Leaf from 'lucide-react-native/icons/leaf';
import { Metrics, useColors } from '@/theme';

type ThumbnailProps = {
  photoUrl?: string | null;
  icon?: LucideIcon;
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function Thumbnail({ photoUrl, icon: Icon = Leaf, color, size = Metrics.size.lg, style }: Readonly<ThumbnailProps>) {
  const colors = useColors();
  const tint = color ?? colors.leaf;
  const iconSize = size > Metrics.size.xl ? Metrics.icon.normal : Metrics.icon.small;

  return (
    <View style={[styles.thumb, { width: size, height: size, backgroundColor: `${tint}1F` }, style]}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.image} contentFit="cover" />
      ) : (
        <Icon size={iconSize} color={tint} strokeWidth={Metrics.icon.stroke.regular} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: Metrics.radius.md,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
