import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { PhotoViewerModal } from '../PhotoViewerModal';
import { SkeletonBlock } from '../Skeleton';
import { InfoSection } from '../InfoSection';
import type { SpeciesInfoQuery } from '../species/useSpeciesInfo';

const PHOTO_WIDTH = Metrics.media.sm;
const PHOTO_HEIGHT = PHOTO_WIDTH / Metrics.aspect.portrait;
const SKELETON_PHOTOS = [0, 1, 2];

function StripSkeleton() {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.strip}>
      {SKELETON_PHOTOS.map((key) => (
        <SkeletonBlock key={key} width={PHOTO_WIDTH} height={PHOTO_HEIGHT} radius={Metrics.radius.md} />
      ))}
    </View>
  );
}

export function ReferencePhotosStrip({ query }: Readonly<{ query: SpeciesInfoQuery }>) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation(['identify', 'common']);
  const [viewerPhotoUrl, setViewerPhotoUrl] = useState<string | null>(null);
  const photos = query.data?.referencePhotos ?? [];

  if (query.isError || (query.data && photos.length === 0)) return null;

  return (
    <InfoSection title={t('compareTitle')}>
      {query.data ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {photos.map((photo) => (
            <Pressable
              key={photo.url}
              onPress={() => setViewerPhotoUrl(photo.url)}
              accessibilityRole="imagebutton"
              accessibilityLabel={t('common:a11yViewPhoto')}
            >
              <Image source={{ uri: photo.url }} style={styles.photo} contentFit="cover" transition={150} />
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <StripSkeleton />
      )}
      <Text style={styles.credit}>{t('referencePhotosCaption')}</Text>
      <PhotoViewerModal photoUrl={viewerPhotoUrl} onClose={() => setViewerPhotoUrl(null)} />
    </InfoSection>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    strip: {
      flexDirection: 'row',
      gap: Metrics.spacing.sm,
    },
    photo: {
      width: PHOTO_WIDTH,
      height: PHOTO_HEIGHT,
      borderRadius: Metrics.radius.md,
      backgroundColor: colors.muted,
    },
    credit: {
      ...Typography.caption,
      color: colors.mutedForeground,
      marginTop: Metrics.spacing.sm,
    },
  });
