import type { PropsWithChildren, ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Metrics, Overlays, type ThemeColors, useThemedStyles } from '@/theme';

type DialogProps = PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
  overlay?: ReactNode;
  cardStyle?: StyleProp<ViewStyle>;
}>;

export function Dialog({ visible, onClose, overlay, cardStyle, children }: Readonly<DialogProps>) {
  const styles = useThemedStyles(makeStyles);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.card, cardStyle]} onPress={(event) => event.stopPropagation()}>
          {children}
        </Pressable>
        {overlay}
      </Pressable>
    </Modal>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: Overlays.scrim,
      padding: Metrics.spacing.lg,
    },
    card: {
      width: '100%',
      maxWidth: Metrics.layout.dialogMaxWidth,
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: Metrics.radius.lg,
      padding: Metrics.spacing.xl,
    },
  });
