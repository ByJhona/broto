import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Gift from 'lucide-react-native/icons/gift';
import { Metrics, Overlays, useColors, type ThemeColors } from '@/theme';
import { EVENT_COLOR, EVENT_ICON } from '@/utils';

type CreateChoiceSheetProps = {
  visible: boolean;
  onCreateListing: () => void;
  onCreateEvent: () => void;
  onClose: () => void;
};

export function CreateChoiceSheet({ visible, onCreateListing, onCreateEvent, onClose }: Readonly<CreateChoiceSheetProps>) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const EventIcon = EVENT_ICON;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + Metrics.spacing.lg }]}>
          <Text style={styles.title}>O que você quer criar?</Text>

          <Pressable style={styles.row} onPress={onCreateListing}>
            <View style={[styles.iconBadge, { backgroundColor: colors.primary }]}>
              <Gift size={Metrics.icon.normal} color={colors.white} strokeWidth={Metrics.icon.strokeWidth} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Nova oferta</Text>
              <Text style={styles.rowSubtitle}>Doe, troque ou resgate uma planta</Text>
            </View>
          </Pressable>

          <Pressable style={styles.row} onPress={onCreateEvent}>
            <View style={[styles.iconBadge, { backgroundColor: EVENT_COLOR }]}>
              <EventIcon size={Metrics.icon.normal} color={colors.white} strokeWidth={Metrics.icon.strokeWidth} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Novo evento</Text>
              <Text style={styles.rowSubtitle}>Marque uma feira, troca ou encontro de plantas</Text>
            </View>
          </Pressable>

          <Pressable style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: Overlays.scrim,
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: Metrics.radius.lg,
      borderTopRightRadius: Metrics.radius.lg,
      padding: Metrics.spacing.lg,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.foreground,
      marginBottom: Metrics.spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.md,
      paddingVertical: Metrics.spacing.sm,
    },
    iconBadge: {
      width: 44,
      height: 44,
      borderRadius: Metrics.radius.full,
      justifyContent: 'center',
      alignItems: 'center',
    },
    rowText: {
      flex: 1,
    },
    rowTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.foreground,
    },
    rowSubtitle: {
      fontSize: 13,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    cancel: {
      alignItems: 'center',
      paddingVertical: Metrics.spacing.md,
      marginTop: Metrics.spacing.xs,
    },
    cancelText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.mutedForeground,
    },
  });
