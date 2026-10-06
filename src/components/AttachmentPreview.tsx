import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Metrics, type ThemeColors, useThemedStyles } from '@/theme';
import { RemovePhotoButton } from './PhotoPagerControls';

type AttachmentPreviewProps = {
  uri: string;
  onRemove: () => void;
  style?: StyleProp<ViewStyle>;
};

export function AttachmentPreview({ uri, onRemove, style }: Readonly<AttachmentPreviewProps>) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={[styles.attachment, style]}>
      <Image source={{ uri }} style={styles.photo} contentFit="cover" />
      <View style={styles.remove}>
        <RemovePhotoButton onPress={onRemove} />
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    attachment: {
      width: Metrics.size.hero,
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
      top: Metrics.spacing.xs,
      right: Metrics.spacing.xs,
    },
  });
