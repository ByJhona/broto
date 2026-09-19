import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Plus from 'lucide-react-native/icons/plus';
import X from 'lucide-react-native/icons/x';
import { Metrics, useColors, type ThemeColors } from '@/theme';

type PhotoGridProps = {
  photoUrls: string[];
  onAdd: () => void;
  onRemove: (photoUrl: string) => void;
  onPressPhoto?: (photoUrl: string) => void;
  max: number;
  disabled?: boolean;
  scroll?: boolean;
};

const TILE_SIZE = 76;

export function PhotoGrid({ photoUrls, onAdd, onRemove, onPressPhoto, max, disabled, scroll }: Readonly<PhotoGridProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const tiles = (
    <>
      {photoUrls.map((url) => (
        <View key={url} style={styles.tile}>
          <Pressable onPress={() => onPressPhoto?.(url)} disabled={!onPressPhoto}>
            <Image source={{ uri: url }} style={styles.tileImage} />
          </Pressable>
          <Pressable style={styles.removeButton} onPress={() => onRemove(url)} disabled={disabled} hitSlop={8}>
            <X size={14} color={colors.white} strokeWidth={Metrics.icon.strokeWidth} />
          </Pressable>
        </View>
      ))}

      {photoUrls.length < max ? (
        <Pressable style={styles.addTile} onPress={onAdd} disabled={disabled}>
          <Plus size={Metrics.icon.normal} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
        </Pressable>
      ) : null}
    </>
  );

  if (scroll) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollRow}>
        {tiles}
      </ScrollView>
    );
  }

  return <View style={styles.row}>{tiles}</View>;
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Metrics.spacing.sm,
    },
    scrollRow: {
      flexDirection: 'row',
      gap: Metrics.spacing.sm,
    },
    tile: {
      width: TILE_SIZE,
      height: TILE_SIZE,
      borderRadius: Metrics.radius.md,
      overflow: 'hidden',
      backgroundColor: colors.muted,
    },
    tileImage: {
      width: '100%',
      height: '100%',
    },
    removeButton: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.black,
      opacity: 0.7,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addTile: {
      width: TILE_SIZE,
      height: TILE_SIZE,
      borderRadius: Metrics.radius.md,
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
