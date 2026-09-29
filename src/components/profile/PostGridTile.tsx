import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Images from 'lucide-react-native/icons/images';
import { Metrics, Overlays, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import type { CommunityPost } from '@/types';

type PostGridTileProps = {
  post: CommunityPost;
  size: number;
  onPress: () => void;
};

export function PostGridTile({ post, size, onPress }: Readonly<PostGridTileProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('profile');
  const [coverUrl] = post.imageUrls;
  const hasManyPhotos = post.imageUrls.length > 1;

  return (
    <Pressable
      style={({ pressed }) => [styles.tile, { width: size, height: size }, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={post.caption || t('postsTab')}
    >
      {coverUrl ? (
        <Image source={{ uri: coverUrl }} style={styles.image} contentFit="cover" transition={200} />
      ) : (
        <Text style={styles.caption} numberOfLines={5}>
          {post.caption}
        </Text>
      )}
      {hasManyPhotos ? (
        <View style={styles.multiple} accessibilityLabel={t('photoCountLabel', { count: post.imageUrls.length })}>
          <Images size={Metrics.icon.small} color={colors.white} strokeWidth={Metrics.icon.strokeWidth} />
        </View>
      ) : null}
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    tile: {
      borderRadius: Metrics.radius.md,
      overflow: 'hidden',
      backgroundColor: `${colors.leaf}14`,
      justifyContent: 'center',
      padding: Metrics.spacing.sm,
    },
    pressed: {
      opacity: 0.8,
    },
    image: {
      position: 'absolute',
      width: '100%',
      height: '100%',
    },
    caption: {
      ...Typography.caption,
      color: colors.foreground,
    },
    multiple: {
      position: 'absolute',
      top: Metrics.spacing.xs,
      right: Metrics.spacing.xs,
      padding: Metrics.spacing.xs,
      borderRadius: Metrics.radius.full,
      backgroundColor: Overlays.scrim,
    },
  });
