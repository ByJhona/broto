import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import X from 'lucide-react-native/icons/x';
import { Metrics, Overlays, useColors, type ThemeColors } from '@/theme';
import { useTranslation } from '@/i18n';
import { formatShortDate } from '@/utils';
import type { EarnedBadge } from '@/types';
import { BadgeCard } from './BadgeCard';

type BadgeDetailModalProps = {
  badge: EarnedBadge | null;
  onClose: () => void;
};

export function BadgeDetailModal({ badge, onClose }: Readonly<BadgeDetailModalProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation('badge');

  return (
    <Modal visible={!!badge} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Pressable style={styles.close} onPress={onClose} hitSlop={8}>
            <X size={Metrics.icon.normal} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
          </Pressable>
          {badge ? (
            <>
              <BadgeCard badge={badge} />
              <Text style={styles.earnedOn}>{t('earnedOnLabel', { date: formatShortDate(badge.grantedAt) })}</Text>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: Overlays.scrim,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Metrics.spacing.lg,
    },
    card: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: colors.background,
      borderRadius: Metrics.radius.lg,
      padding: Metrics.spacing.xl,
      alignItems: 'center',
    },
    close: {
      position: 'absolute',
      top: Metrics.spacing.md,
      right: Metrics.spacing.md,
    },
    earnedOn: {
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: Metrics.spacing.md,
    },
  });
