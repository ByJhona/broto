import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Droplet from 'lucide-react-native/icons/droplet';
import Leaf from 'lucide-react-native/icons/leaf';
import Sun from 'lucide-react-native/icons/sun';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import type { PlantSummary } from '@/types';
import { sunLevelLabel } from '@/utils';
import { SkeletonBlock } from './Skeleton';

type PlantCardProps = {
  plant: PlantSummary;
  readOnly?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const PlantCard = memo(function PlantCard({ plant, readOnly = false, style }: Readonly<PlantCardProps>) {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const hasTags = plant.sunLevel != null || plant.wateringDays != null;

  const content = (
    <>
      <View style={styles.photo}>
        {plant.photoUrl ? (
          <Image
            source={{ uri: plant.photoUrl }}
            style={styles.photoImage}
            contentFit="cover"
            recyclingKey={plant.id}
            cachePolicy="memory-disk"
          />
        ) : (
          <Leaf size={Metrics.icon.xl} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {plant.name}
        </Text>
        {plant.commonName || plant.species ? (
          <Text style={styles.species} numberOfLines={1}>
            {plant.commonName ?? plant.species}
          </Text>
        ) : null}

        {hasTags ? (
          <View style={styles.tagRow}>
            {plant.wateringDays ? (
              <View style={styles.tag}>
                <Droplet size={13} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
                <Text style={styles.tagText}>{plant.wateringDays}d</Text>
              </View>
            ) : null}
            {plant.sunLevel ? (
              <View style={styles.tag}>
                <Sun size={13} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
                <Text style={styles.tagText} numberOfLines={1}>
                  {sunLevelLabel(plant.sunLevel)}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </>
  );

  if (readOnly) {
    return <View style={[styles.card, style]}>{content}</View>;
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.card, style, pressed && styles.cardPressed]}
      onPress={() => router.push(`/plant/${plant.id}`)}
    >
      {content}
    </Pressable>
  );
});

export function PlantCardSkeleton({ style }: Readonly<{ style?: StyleProp<ViewStyle> }>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.card, style]}>
      <View style={styles.photo} />
      <View style={styles.info}>
        <SkeletonBlock width="70%" height={16} />
        <SkeletonBlock width="50%" height={12} style={styles.skeletonGap} />
        <View style={[styles.tagRow, styles.skeletonGap]}>
          <SkeletonBlock width={50} height={22} radius={Metrics.radius.full} />
          <SkeletonBlock width={70} height={22} radius={Metrics.radius.full} />
        </View>
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: Metrics.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.8,
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  info: {
    padding: Metrics.spacing.md,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
  },
  species: {
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.mutedForeground,
    marginTop: 1,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Metrics.spacing.sm,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: 4,
    backgroundColor: `${colors.leaf}14`,
    borderRadius: Metrics.radius.full,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  tagText: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '600',
    color: colors.leaf,
  },
  skeletonGap: {
    marginTop: Metrics.spacing.sm,
  },
  });
