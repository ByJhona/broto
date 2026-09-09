import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Coins from 'lucide-react-native/icons/coins';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { useAuth, useCredits } from '@/hooks';
import type { CreditsState } from '@/services';

function getCreditsTitle(credits: CreditsState | null): string {
  if (!credits) return 'Carregando créditos...';
  if (credits.monthlyCredits == null) return 'Créditos ilimitados';
  return `${credits.balance} créditos disponíveis`;
}

function getCreditsSubtitle(credits: CreditsState | null): string {
  if (!credits) return '';
  if (credits.monthlyCredits == null) return `${credits.planName} · usados pra identificar plantas`;
  const period = credits.creditRenewalPeriod === 'weekly' ? 'semana' : 'mês';
  return `${credits.planName} · renova ${credits.monthlyCredits} por ${period}`;
}

export function CreditsCard() {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { session } = useAuth();
  const { credits } = useCredits();

  if (!session) {
    return (
      <Pressable
        onPress={() => router.push('/(auth)/login')}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <View style={styles.icon}>
          <Coins size={Metrics.icon.large} color={colors.white} strokeWidth={Metrics.icon.strokeWidth} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Entre pra ver seus créditos</Text>
          <Text style={styles.subtitle}>Crie uma conta pra identificar plantas e ganhar créditos.</Text>
        </View>
      </Pressable>
    );
  }

  const title = getCreditsTitle(credits);
  const subtitle = getCreditsSubtitle(credits);

  return (
    <Pressable
      onPress={() => router.push('/profile/plans')}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.icon}>
        <Coins size={Metrics.icon.large} color={colors.white} strokeWidth={Metrics.icon.strokeWidth} />
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
    backgroundColor: colors.primary,
    borderRadius: Metrics.radius.full,
    paddingVertical: Metrics.spacing.md,
    paddingHorizontal: Metrics.spacing.md,
    gap: Metrics.spacing.md,
  },
  cardPressed: {
    opacity: 0.9,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: Metrics.radius.full,
    backgroundColor: `${colors.primaryForeground}26`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
  subtitle: {
    fontSize: 13,
    color: colors.primaryForeground,
    opacity: 0.85,
    marginTop: 2,
  },
  });
