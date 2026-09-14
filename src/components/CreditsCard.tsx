import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Coins from 'lucide-react-native/icons/coins';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { useTranslation } from '@/i18n';
import { useAuth, useCredits } from '@/hooks';
import type { CreditsState } from '@/services';

function getCreditsTitle(credits: CreditsState | null, t: (key: string, options?: Record<string, unknown>) => string): string {
  if (!credits) return t('loadingCredits');
  if (credits.monthlyCredits == null) return t('unlimitedCredits');
  return t('creditsAvailable', { count: credits.balance });
}

function getCreditsSubtitle(credits: CreditsState | null, t: (key: string, options?: Record<string, unknown>) => string): string {
  if (!credits) return '';
  if (credits.monthlyCredits == null) return t('planUsedForIdentification', { planName: credits.planName });
  const period = credits.creditRenewalPeriod === 'weekly' ? t('week') : t('month');
  return t('planRenewsCredits', { planName: credits.planName, count: credits.monthlyCredits, period });
}

export function CreditsCard() {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation('credits');
  const { session } = useAuth();
  const { credits } = useCredits();

  if (!session) {
    return (
      <Pressable
        onPress={() => router.push('/(auth)/login')}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <View style={styles.icon}>
          <Coins size={Metrics.icon.large} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{t('signInToSeeCredits')}</Text>
          <Text style={styles.subtitle}>{t('signInToSeeCreditsSubtitle')}</Text>
        </View>
      </Pressable>
    );
  }

  const title = getCreditsTitle(credits, t);
  const subtitle = getCreditsSubtitle(credits, t);

  return (
    <Pressable
      onPress={() => router.push('/profile/plans')}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.icon}>
        <Coins size={Metrics.icon.large} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: Metrics.radius.full,
    paddingVertical: Metrics.spacing.md,
    paddingHorizontal: Metrics.spacing.md,
    gap: Metrics.spacing.md,
  },
  cardPressed: {
    opacity: 0.85,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: Metrics.radius.full,
    backgroundColor: `${colors.leaf}1A`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
  },
  subtitle: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  });
