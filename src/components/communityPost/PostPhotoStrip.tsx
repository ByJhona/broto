import { ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Metrics, type ThemeColors, useThemedStyles } from '@/theme';
import { RemovePhotoButton } from '../PhotoPagerControls';

const TILE_WIDTH = Metrics.media.sm;

type PostPhotoStripProps = {
  photoUris: string[];
  onRemove: (uri: string) => void;
};

export function PostPhotoStrip({ photoUris, onRemove }: Readonly<PostPhotoStripProps>) {
  const styles = useThemedStyles(makeStyles);
  if (photoUris.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.strip}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {photoUris.map((uri) => (
        <View key={uri} style={styles.tile}>
          <Image source={{ uri }} style={styles.photo} contentFit="cover" transition={200} />
          <View style={styles.remove}>
            <RemovePhotoButton onPress={() => onRemove(uri)} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    strip: {
      marginBottom: Metrics.spacing.xl,
    },
    row: {
      gap: Metrics.spacing.sm,
    },
    tile: {
      width: TILE_WIDTH,
      aspectRatio: Metrics.aspect.portrait,
      borderRadius: Metrics.radius.lg,
      overflow: 'hidden',
      backgroundColor: colors.muted,
    },
    photo: {
      width: '100%',
      height: '100%',
    },
    remove: {
      position: 'absolute',
      top: Metrics.spacing.sm,
      right: Metrics.spacing.sm,
    },
  });
