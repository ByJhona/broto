import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { registerLevelUpHandler } from '@/utils';
import { ConfettiBurst } from './ConfettiBurst';
import { Dialog } from './Dialog';
import { Button } from './Button';

export function LevelUpHost() {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  const [level, setLevel] = useState<number | null>(null);

  useEffect(() => {
    registerLevelUpHandler((nextLevel) => {
      setLevel(nextLevel);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });
    return () => registerLevelUpHandler(null);
  }, []);

  const handleClose = () => setLevel(null);

  return (
    <Dialog visible={level !== null} onClose={handleClose} overlay={level === null ? null : <ConfettiBurst playKey={level} />}>
      <Text style={styles.level}>{level}</Text>
      <Text style={styles.title}>{t('levelUpTitle')}</Text>
      <Text style={styles.message}>{t('levelUpMessage', { level })}</Text>
      <View style={styles.actions}>
        <Button label={t('levelUpContinue')} onPress={handleClose} />
      </View>
    </Dialog>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
