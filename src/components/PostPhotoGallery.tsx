import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import { Metrics, Overlays, useColors, type ThemeColors } from '@/theme';
import { PhotoViewerModal } from './PhotoViewerModal';

type PostPhotoGalleryProps = {
  imageUrls: string[];
  recyclingKey: string;
};

export function PostPhotoGallery({ imageUrls, recyclingKey }: Readonly<PostPhotoGalleryProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [containerWidth, setContainerWidth] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  if (imageUrls.length === 0) return null;

  const handleLayout = (event: LayoutChangeEvent) => setContainerWidth(event.nativeEvent.layout.width);

  return (
    <>
      <View style={styles.gallery} onLayout={handleLayout}>
        {containerWidth > 0 ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => setPhotoIndex(Math.round(event.nativeEvent.contentOffset.x / containerWidth))}
          >
            {imageUrls.map((url, index) => (
              <Pressable key={url} onPress={() => setViewerIndex(index)}>
                <Image
                  source={{ uri: url }}
                  style={[styles.photo, { width: containerWidth }]}
                  contentFit="cover"
                  recyclingKey={`${recyclingKey}-${index}`}
                  cachePolicy="memory-disk"
                />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {imageUrls.length > 1 ? (
          <View style={styles.counter}>
            <Text style={styles.counterText}>
              {photoIndex + 1}/{imageUrls.length}
            </Text>
          </View>
        ) : null}
      </View>

      <PhotoViewerModal photoUrl={viewerIndex != null ? imageUrls[viewerIndex] : null} onClose={() => setViewerIndex(null)} />
    </>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    gallery: {
      position: 'relative',
      width: '100%',
      aspectRatio: 1,
      borderRadius: Metrics.radius.md,
      overflow: 'hidden',
      backgroundColor: colors.muted,
    },
    photo: {
      height: '100%',
      backgroundColor: colors.muted,
    },
    counter: {
      position: 'absolute',
      top: Metrics.spacing.sm,
      right: Metrics.spacing.sm,
      backgroundColor: Overlays.scrimMedium,
      borderRadius: Metrics.radius.full,
      paddingVertical: 4,
      paddingHorizontal: Metrics.spacing.sm,
    },
    counterText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.white,
    },
  });
