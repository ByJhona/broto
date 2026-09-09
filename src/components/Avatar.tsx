import { useMemo } from 'react';
import { StyleSheet, Text, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useColors, type ThemeColors } from '@/theme';

type AvatarProps = {
  name: string;
  url?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function Avatar({ name, url, size = 52, style }: Readonly<AvatarProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
      <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
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
      fontWeight: '700',
    },
  });
