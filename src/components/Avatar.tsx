import { StyleSheet, Text, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Metrics, Fonts, type ThemeColors, useThemedStyles } from '@/theme';

const INITIAL_RATIO = 0.4;

type AvatarProps = {
  name: string;
  url?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function Avatar({ name, url, size = Metrics.size.xl, style }: Readonly<AvatarProps>) {
  const styles = useThemedStyles(makeStyles);
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={[{ width: size, height: size, borderRadius: size / 2 }, style as StyleProp<ImageStyle>]}
        contentFit="cover"
      />
    );
  }

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }, style]}>
      <Text style={[styles.initial, { fontSize: size * INITIAL_RATIO }]}>{initial}</Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
    },
    initial: {
      color: colors.secondaryForeground,
      fontFamily: Fonts.display,
      fontWeight: '700',
    },
  });
