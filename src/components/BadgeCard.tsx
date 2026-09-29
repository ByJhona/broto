import { StyleSheet, Text, View } from 'react-native';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import type { Badge } from '@/types';
import { PixelBadge } from './PixelBadge';

type BadgeCardProps = {
  badge: Badge;
  locked?: boolean;
};

export function BadgeCard({ badge, locked = false }: Readonly<BadgeCardProps>) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.container}>
      <PixelBadge pixelArt={badge.pixelArt} size={Metrics.media.sm} locked={locked} />
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
      ...Typography.title,
      color: colors.foreground,
      marginTop: Metrics.spacing.md,
      textAlign: 'center',
    },
    description: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
      textAlign: 'center',
      marginTop: Metrics.spacing.xs,
    },
  });
