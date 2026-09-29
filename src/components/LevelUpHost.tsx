import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import LottieView from 'lottie-react-native';
import { Metrics, Overlays, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { useReduceMotion } from '@/hooks';
import { registerLevelUpHandler } from '@/utils';
import { SubmitButton } from './SubmitButton';

const CONFETTI_ANIMATION = require('../../assets/animations/confetti.json');

export function LevelUpHost() {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const [level, setLevel] = useState<number | null>(null);

  useEffect(() => {
    registerLevelUpHandler((nextLevel) => {
      setLevel(nextLevel);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });
    return () => registerLevelUpHandler(null);
  }, []);

  const handleClose = () => setLevel(null);
  const showConfetti = level !== null && !reduceMotion;

  return (
    <Modal visible={level !== null} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.level}>{level}</Text>
          <Text style={styles.title}>{t('levelUpTitle')}</Text>
          <Text style={styles.message}>{t('levelUpMessage', { level })}</Text>
          <View style={styles.actions}>
            <SubmitButton label={t('levelUpContinue')} onPress={handleClose} />
          </View>
        </View>
        {showConfetti ? (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <LottieView key={level} source={CONFETTI_ANIMATION} autoPlay loop={false} style={StyleSheet.absoluteFill} />
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
    card: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: colors.background,
      borderRadius: Metrics.radius.lg,
      padding: Metrics.spacing.xl,
      alignItems: 'center',
    },
    level: {
      ...Typography.hero,
      color: colors.primary,
    },
    title: {
      ...Typography.title,
      color: colors.foreground,
      marginTop: Metrics.spacing.sm,
      textAlign: 'center',
    },
    message: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
      marginTop: Metrics.spacing.xs,
      textAlign: 'center',
    },
    actions: {
      alignSelf: 'stretch',
      marginTop: Metrics.spacing.lg,
    },
  });
