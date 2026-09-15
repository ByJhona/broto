import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import type { Badge } from '@/types';
import { PixelBadge } from './PixelBadge';

type BadgeCardProps = {
  badge: Badge;
};

export function BadgeCard({ badge }: Readonly<BadgeCardProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <PixelBadge pixelArt={badge.pixelArt} size={120} />
      <Text style={styles.name}>{badge.name}</Text>
      <Text style={styles.description}>{badge.description}</Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
    },
    name: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.foreground,
      marginTop: Metrics.spacing.md,
      textAlign: 'center',
    },
    description: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: 'center',
      marginTop: Metrics.spacing.xs,
    },
  });
