import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Droplet, Leaf, Sun } from 'lucide-react-native';
import { Colors, Metrics } from '@/theme';
import type { Plant } from '@/types';
import { sunLevelLabel } from '@/utils';

type PlantCardProps = {
  plant: Plant;
  readOnly?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PlantCard({ plant, readOnly = false, style }: PlantCardProps) {
  const router = useRouter();
  const hasTags = plant.sunLevel != null || plant.wateringDays != null;

  const content = (
    <>
      <View style={styles.photo}>
        {plant.photoUrl ? (
          <Image source={{ uri: plant.photoUrl }} style={styles.photoImage} contentFit="cover" />
        ) : (
          <Leaf size={Metrics.icon.xl} color={Colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
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
                <Droplet size={13} color={Colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
                <Text style={styles.tagText}>{plant.wateringDays}d</Text>
              </View>
            ) : null}
            {plant.sunLevel ? (
              <View style={styles.tag}>
                <Sun size={13} color={Colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
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
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Metrics.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.8,
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Colors.muted,
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
    color: Colors.foreground,
  },
  species: {
    fontSize: 12,
    fontStyle: 'italic',
    color: Colors.mutedForeground,
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
    backgroundColor: `${Colors.leaf}14`,
    borderRadius: Metrics.radius.full,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  tagText: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '600',
    color: Colors.leaf,
  },
});
