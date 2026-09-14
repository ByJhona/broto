import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Folder from 'lucide-react-native/icons/folder';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import type { PlantGroup } from '@/types';

const GROUP_CARD_WIDTH = 140;

function plantCountLabel(count: number): string {
  if (count === 0) return 'Vazio';
  if (count === 1) return '1 planta';
  return `${count} plantas`;
}

type GroupPhotoCollageProps = {
  photoUrls: string[];
};

function GroupPhotoCollage({ photoUrls }: Readonly<GroupPhotoCollageProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (photoUrls.length === 0) {
    return (
      <View style={[styles.collage, styles.collageEmpty]}>
        <Folder size={Metrics.icon.large} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
      </View>
    );
  }

  if (photoUrls.length === 1) {
    return (
      <View style={styles.collage}>
        <Image source={{ uri: photoUrls[0] }} style={styles.collageFill} contentFit="cover" />
      </View>
    );
  }

  if (photoUrls.length === 2) {
    return (
      <View style={[styles.collage, styles.collageRow]}>
        <Image source={{ uri: photoUrls[0] }} style={styles.collageFill} contentFit="cover" />
        <Image source={{ uri: photoUrls[1] }} style={styles.collageFill} contentFit="cover" />
      </View>
    );
  }

  if (photoUrls.length === 3) {
    return (
      <View style={[styles.collage, styles.collageRow]}>
        <Image source={{ uri: photoUrls[0] }} style={styles.collageFill} contentFit="cover" />
        <View style={styles.collageColumn}>
          <Image source={{ uri: photoUrls[1] }} style={styles.collageFill} contentFit="cover" />
          <Image source={{ uri: photoUrls[2] }} style={styles.collageFill} contentFit="cover" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.collage, styles.collageGrid]}>
      {photoUrls.slice(0, 4).map((url) => (
        <Image key={url} source={{ uri: url }} style={styles.collageQuarter} contentFit="cover" />
      ))}
    </View>
  );
}

type PlantGroupCardProps = {
  group: PlantGroup;
};

export const PlantGroupCard = memo(function PlantGroupCard({ group }: Readonly<PlantGroupCardProps>) {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push(`/group/${group.id}`)}
    >
      <GroupPhotoCollage photoUrls={group.previewPhotoUrls} />
      <Text style={styles.name} numberOfLines={1}>
        {group.name}
      </Text>
      <Text style={styles.count}>{plantCountLabel(group.plantCount)}</Text>
    </Pressable>
  );
});

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      width: GROUP_CARD_WIDTH,
    },
    cardPressed: {
      opacity: 0.8,
    },
    collage: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: Metrics.radius.lg,
      overflow: 'hidden',
      backgroundColor: colors.muted,
      gap: 2,
    },
    collageEmpty: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    collageRow: {
      flexDirection: 'row',
    },
    collageColumn: {
      flex: 1,
      gap: 2,
    },
    collageFill: {
      flex: 1,
      width: '100%',
      height: '100%',
      backgroundColor: colors.muted,
    },
    collageGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    collageQuarter: {
      width: '49.5%',
      height: '49.5%',
      backgroundColor: colors.muted,
    },
    name: {
      marginTop: Metrics.spacing.xs,
      fontSize: 14,
      fontWeight: '700',
      color: colors.foreground,
    },
    count: {
      fontSize: 12,
      color: colors.mutedForeground,
    },
  });
