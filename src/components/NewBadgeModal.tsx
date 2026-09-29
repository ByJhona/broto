import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import LottieView from 'lottie-react-native';
import { Metrics, Overlays, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import type { Badge } from '@/types';
import { BadgeCard } from './BadgeCard';
import { SubmitButton } from './SubmitButton';

const CONFETTI_ANIMATION = require('../../assets/animations/confetti.json');

type NewBadgeModalProps = {
  badge: Badge | null;
  onClaim: () => void;
  onClose: () => void;
};

export function NewBadgeModal({ badge, onClaim, onClose }: Readonly<NewBadgeModalProps>) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('badge');

  return (
    <Modal visible={!!badge} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('newBadgeTitle')}</Text>
          {badge ? <BadgeCard badge={badge} /> : null}
          <View style={styles.actions}>
            <SubmitButton label={t('claim')} onPress={onClaim} />
          </View>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>{t('close')}</Text>
          </Pressable>
        </View>
        {badge ? (
          <View pointerEvents="none" style={styles.confetti}>
            <LottieView
              key={badge.id}
              source={CONFETTI_ANIMATION}
              autoPlay
              loop={false}
              style={StyleSheet.absoluteFill}
            />
          </View>
        ) : null}
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
    confetti: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
    card: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: colors.background,
      borderRadius: Metrics.radius.lg,
      padding: Metrics.spacing.xl,
      alignItems: 'center',
    },
    title: {
      ...Typography.title,
      color: colors.foreground,
      marginBottom: Metrics.spacing.md,
      textAlign: 'center',
    },
    actions: {
      alignSelf: 'stretch',
      marginTop: Metrics.spacing.lg,
    },
    closeButton: {
      alignItems: 'center',
      marginTop: Metrics.spacing.sm,
      padding: Metrics.spacing.sm,
    },
    closeText: {
      ...Typography.label,
      color: colors.mutedForeground,
    },
  });
