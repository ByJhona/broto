import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Coins from 'lucide-react-native/icons/coins';
import TicketCheck from 'lucide-react-native/icons/ticket-check';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { Card, FloatingScreenControls, FormField, IconBadge, InfoSection, ScreenHeader, SubmitButton, useScreenTopInset } from '@/components';
import { LuckyNumberCard } from '@/components/promo/LuckyNumberCard';
import { useAuth, useCredits } from '@/hooks';
import {
  formatLuckyNumber,
  getMyLuckyNumbers,
  LUCKY_NUMBERS_QUERY_KEY,
  PromoCodeError,
  PROMO_CODE_ERROR,
  redeemPromoCode,
  type PromoCodeErrorKind,
  type PromoCodeReward,
} from '@/services';

const ERROR_KEYS: Record<PromoCodeErrorKind, string> = {
  [PROMO_CODE_ERROR.INVALID]: 'promoInvalid',
  [PROMO_CODE_ERROR.EXPIRED]: 'promoExpired',
  [PROMO_CODE_ERROR.EXHAUSTED]: 'promoExhausted',
  [PROMO_CODE_ERROR.ALREADY_REDEEMED]: 'promoAlreadyRedeemed',
  [PROMO_CODE_ERROR.UNKNOWN]: 'promoUnknownError',
};

function RewardSummary({ reward, onDone }: Readonly<{ reward: PromoCodeReward; onDone: () => void }>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('credits');

  return (
    <View style={styles.reward}>
      <View style={styles.rewardHeader}>
        <IconBadge size={Metrics.size.hero} backgroundColor={`${colors.leaf}1F`}>
          <TicketCheck size={Metrics.icon.xl} color={colors.leaf} strokeWidth={Metrics.icon.stroke.regular} />
        </IconBadge>
        <Text style={styles.rewardTitle}>{t('promoSuccessTitle')}</Text>
        <Text style={styles.rewardCampaign}>{reward.campaignName}</Text>
      </View>

      {reward.luckyNumber ? (
        <Card style={styles.luckyCard}>
          <Text style={styles.luckyLabel}>{t('promoLuckyNumberLabel')}</Text>
          <Text style={styles.luckyNumber}>{formatLuckyNumber(reward.luckyNumber)}</Text>
          <Text style={styles.luckyHint}>{t('promoLuckyNumberHint')}</Text>
        </Card>
      ) : null}

      {reward.credits > 0 ? (
        <View style={styles.creditsRow}>
          <Coins size={Metrics.icon.small} color={colors.leaf} strokeWidth={Metrics.icon.stroke.regular} />
          <Text style={styles.creditsText}>{t('promoCreditsEarned', { count: reward.credits })}</Text>
        </View>
      ) : null}

      <SubmitButton label={t('promoDone')} onPress={onDone} />
    </View>
  );
}

export default function RedeemCodeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = useScreenTopInset();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('credits');
  const params = useLocalSearchParams<{ code?: string }>();
  const { applyCreditBalance } = useCredits();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const luckyNumbersQuery = useQuery({
    queryKey: [LUCKY_NUMBERS_QUERY_KEY, user?.id],
    queryFn: getMyLuckyNumbers,
    enabled: !!user?.id,
  });
  const luckyNumbers = luckyNumbersQuery.data ?? [];
  const [code, setCode] = useState(params.code ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [reward, setReward] = useState<PromoCodeReward | null>(null);

  const handleRedeem = async () => {
    if (isRedeeming) return;
    if (!code.trim()) {
      setError(t('promoEmpty'));
      return;
    }

    setError(null);
    setIsRedeeming(true);
    try {
      const result = await redeemPromoCode(code);
      applyCreditBalance(result.creditBalance);
      queryClient.invalidateQueries({ queryKey: [LUCKY_NUMBERS_QUERY_KEY] });
      setReward(result);
    } catch (err) {
      const kind = err instanceof PromoCodeError ? err.kind : PROMO_CODE_ERROR.UNKNOWN;
      setError(t(ERROR_KEYS[kind]));
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={[styles.content, { paddingTop: topInset, paddingBottom: insets.bottom + Metrics.spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        {reward ? (
          <RewardSummary reward={reward} onDone={() => router.back()} />
        ) : (
          <>
            <ScreenHeader title={t('promoTitle')} subtitle={t('promoSubtitle')} />
            <FormField
              label={t('promoCodeLabel')}
              placeholder={t('promoCodePlaceholder')}
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleRedeem}
              error={error ?? undefined}
            />
            <SubmitButton label={t('promoRedeem')} onPress={handleRedeem} loading={isRedeeming} />
            {luckyNumbers.length > 0 ? (
              <InfoSection title={t('luckyNumbersTitle')}>
                <View style={styles.luckyList}>
                  {luckyNumbers.map((item) => (
                    <LuckyNumberCard key={item.campaignId} item={item} />
                  ))}
                </View>
              </InfoSection>
            ) : null}
          </>
        )}
      </KeyboardAwareScrollView>
      <FloatingScreenControls />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      ...Metrics.layout.centeredContent,
      paddingHorizontal: Metrics.spacing.lg,
      gap: Metrics.spacing.lg,
    },
    luckyList: {
      gap: Metrics.spacing.sm,
    },
    reward: {
      gap: Metrics.spacing.md,
    },
    rewardHeader: {
      alignItems: 'center',
      gap: Metrics.spacing.md,
    },
    rewardTitle: {
      ...Typography.title,
      color: colors.foreground,
      textAlign: 'center',
    },
    rewardCampaign: {
      ...Typography.body,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
    luckyCard: {
      alignItems: 'center',
      gap: Metrics.spacing.xs,
      paddingVertical: Metrics.spacing.lg,
    },
    luckyLabel: {
      ...Typography.label,
      color: colors.mutedForeground,
    },
    luckyNumber: {
      ...Typography.headline,
      color: colors.primary,
    },
    luckyHint: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
    creditsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: Metrics.spacing.xs,
    },
    creditsText: {
      ...Typography.labelStrong,
      color: colors.leaf,
    },
  });
