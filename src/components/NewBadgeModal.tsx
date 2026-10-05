import { StyleSheet, Text, View } from 'react-native';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import type { Badge } from '@/types';
import { BadgeCard } from './BadgeCard';
import { ConfettiBurst } from './ConfettiBurst';
import { Dialog } from './Dialog';
import { SubmitButton } from './SubmitButton';
import { TextButton } from './TextButton';

type NewBadgeModalProps = {
  badge: Badge | null;
  onClaim: () => void;
  onClose: () => void;
};

export function NewBadgeModal({ badge, onClaim, onClose }: Readonly<NewBadgeModalProps>) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('badge');

  return (
    <Dialog visible={!!badge} onClose={onClose} overlay={badge ? <ConfettiBurst playKey={badge.id} /> : null}>
      <Text style={styles.title}>{t('newBadgeTitle')}</Text>
      {badge ? <BadgeCard badge={badge} /> : null}
      <View style={styles.actions}>
        <SubmitButton label={t('claim')} onPress={onClaim} />
      </View>
      <TextButton label={t('close')} onPress={onClose} style={styles.closeButton} />
    </Dialog>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
      marginTop: Metrics.spacing.sm,
    },
  });
