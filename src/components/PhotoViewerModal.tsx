import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import X from 'lucide-react-native/icons/x';
import { Metrics, Overlays, useColors, type ThemeColors } from '@/theme';

type PhotoViewerModalProps = {
  photoUrl: string | null;
  onClose: () => void;
};

export function PhotoViewerModal({ photoUrl, onClose }: Readonly<PhotoViewerModalProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Modal visible={!!photoUrl} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.close} onPress={onClose}>
          <X size={Metrics.icon.large} color={colors.white} strokeWidth={Metrics.icon.strokeWidth} />
        </Pressable>
        {photoUrl ? <Image source={{ uri: photoUrl }} style={styles.image} contentFit="contain" /> : null}
      </View>
    </Modal>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: Overlays.scrimStrong,
      justifyContent: 'center',
      alignItems: 'center',
    },
    close: {
      position: 'absolute',
      top: 60,
      right: Metrics.spacing.lg,
      zIndex: 1,
    },
    image: {
      width: '90%',
      height: '60%',
      borderRadius: Metrics.radius.lg,
    },
  });
