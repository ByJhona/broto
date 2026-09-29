import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import Flower2 from 'lucide-react-native/icons/flower-2';
import Leaf from 'lucide-react-native/icons/leaf';
import Sprout from 'lucide-react-native/icons/sprout';
import Sun from 'lucide-react-native/icons/sun';
import { Metrics, useColors, type ThemeColors } from '@/theme';

const COVER_ICONS = [Sprout, Leaf, Flower2, Sun];

function hashSlug(slug: string): number {
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  return hash;
}

function coverArt(colors: ThemeColors, slug: string) {
  const tones = [colors.leaf, colors.primary, colors.accent];
  const hash = hashSlug(slug);
  return { tone: tones[hash % tones.length], Icon: COVER_ICONS[hash % COVER_ICONS.length] };
}

type ArticleCoverProps = {
  slug: string;
  coverUrl: string | null;
  iconSize: number;
  style?: StyleProp<ViewStyle>;
};

export function ArticleCover({ slug, coverUrl, iconSize, style }: Readonly<ArticleCoverProps>) {
  const colors = useColors();

  if (coverUrl) {
    return (
      <View style={[styles.cover, style]} accessible={false}>
        <Image source={{ uri: coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
      </View>
    );
  }

  const { tone, Icon } = coverArt(colors, slug);
  return (
    <View style={[styles.cover, styles.placeholder, { backgroundColor: `${tone}1F` }, style]} accessible={false}>
      <Icon size={iconSize} color={tone} strokeWidth={Metrics.icon.strokeWidth} />
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    overflow: 'hidden',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
