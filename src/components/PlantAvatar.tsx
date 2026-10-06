import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Leaf from 'lucide-react-native/icons/leaf';
import { Metrics, useColors, type ThemeColors, useThemedStyles } from '@/theme';

type PlantAvatarProps = PropsWithChildren<{
  photoUrl?: string | null;
  size?: number;
  selected?: boolean;
}>;

export function PlantAvatar({ photoUrl, size = Metrics.size.lg, selected = false, children }: Readonly<PlantAvatarProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);

  const content = photoUrl ? (
    <Image source={{ uri: photoUrl }} style={styles.image} contentFit="cover" />
  ) : (
    <Leaf size={Metrics.icon.normal} color={colors.leaf} strokeWidth={Metrics.icon.stroke.regular} />
  );

  return <View style={[styles.avatar, { width: size, height: size }, selected && styles.selected]}>{children ?? content}</View>;
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    avatar: {
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      borderRadius: Metrics.radius.full,
      borderWidth: Metrics.borderWidth.lg,
      borderColor: 'transparent',
      backgroundColor: colors.muted,
    },
    selected: {
      borderColor: colors.leaf,
    },
    image: {
      width: '100%',
      height: '100%',
    },
  });
