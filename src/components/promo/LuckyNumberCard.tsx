import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { formatLuckyNumber, type LuckyNumber } from '@/services';
import { formatShortDate } from '@/utils';
import { Card } from '../Card';
import { Button } from '../Button';

function statusText(item: LuckyNumber, t: (key: string, options?: Record<string, unknown>) => string): string {
  if (item.isWinner) return t('luckyStatusWinner');
  if (item.drawnAt) return t('luckyStatusDrawn');
  return item.endsAt ? t('luckyStatusPendingUntil', { date: formatShortDate(item.endsAt) }) : t('luckyStatusPending');
}

export function LuckyNumberCard({ item }: Readonly<{ item: LuckyNumber }>) {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('credits');
  const contactUserId = item.isWinner ? item.contactUserId : null;

  return (
    <Card style={[styles.card, item.isWinner && styles.cardWinner]}>
      <View style={styles.row}>
        <Text style={[styles.number, item.isWinner && styles.numberWinner]}>{formatLuckyNumber(item.luckyNumber)}</Text>
        <View style={styles.body}>
          <Text style={styles.campaign} numberOfLines={1}>
            {item.campaignName}
          </Text>
          <Text style={[styles.status, item.isWinner && styles.statusWinner]}>{statusText(item, t)}</Text>
        </View>
      </View>
      {contactUserId ? (
        <Button
          label={t('luckyContactAction')}
          onPress={() => router.push({ pathname: '/chat', params: { otherUserId: contactUserId } })}
        />
      ) : null}
    </Card>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      gap: Metrics.spacing.md,
    },
    cardWinner: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}14`,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.md,
    },
    number: {
      ...Typography.heading,
      color: colors.foreground,
    },
    numberWinner: {
      color: colors.primary,
    },
    body: {
      flex: 1,
    },
    campaign: {
      ...Typography.headingMedium,
      color: colors.foreground,
    },
    status: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
    },
    statusWinner: {
      ...Typography.labelStrong,
      color: colors.primary,
    },
  });
