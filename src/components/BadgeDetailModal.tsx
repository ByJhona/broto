import { Pressable, StyleSheet, Text } from 'react-native';
import X from 'lucide-react-native/icons/x';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { formatShortDate } from '@/utils';
import type { Badge } from '@/types';
import { BadgeCard } from './BadgeCard';
import { Dialog } from './Dialog';

type BadgeDetailModalProps = {
  badge: Badge | null;
  grantedAt?: string | null;
  onClose: () => void;
};

export function BadgeDetailModal({ badge, grantedAt = null, onClose }: Readonly<BadgeDetailModalProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('badge');

  return (
    <Dialog visible={!!badge} onClose={onClose}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('common:close')} style={styles.close} onPress={onClose} hitSlop={Metrics.hitSlop}>
        <X size={Metrics.icon.normal} color={colors.mutedForeground} strokeWidth={Metrics.icon.stroke.regular} />
      </Pressable>
      {badge ? (
        <>
          <BadgeCard badge={badge} locked={!grantedAt} />
          <Text style={styles.earnedOn}>
            {grantedAt ? t('earnedOnLabel', { date: formatShortDate(grantedAt) }) : t('notYetEarnedLabel')}
          </Text>
        </>
      ) : null}
    </Dialog>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    close: {
      position: 'absolute',
      top: Metrics.spacing.md,
      right: Metrics.spacing.md,
    },
    earnedOn: {
      ...Typography.caption,
      color: colors.mutedForeground,
      marginTop: Metrics.spacing.md,
    },
  });
