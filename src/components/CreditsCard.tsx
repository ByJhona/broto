import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Coins } from 'lucide-react-native';
import { Colors, Metrics } from '@/theme';
import { useAuth, useCredits } from '@/hooks';

export function CreditsCard() {
  const router = useRouter();
  const { session } = useAuth();
  const { credits } = useCredits();

  if (!session) {
    return (
      <Pressable
        onPress={() => router.push('/(auth)/login')}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <View style={styles.icon}>
          <Coins size={Metrics.icon.large} color={Colors.white} strokeWidth={Metrics.icon.strokeWidth} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Entre pra ver seus créditos</Text>
          <Text style={styles.subtitle}>Crie uma conta pra identificar plantas e ganhar créditos.</Text>
        </View>
      </Pressable>
    );
  }

  const title = !credits
    ? 'Carregando créditos...'
    : credits.monthlyCredits == null
      ? 'Créditos ilimitados'
      : `${credits.balance} créditos disponíveis`;

  const subtitle = !credits
    ? ''
    : credits.monthlyCredits == null
      ? `${credits.planName} · usados pra identificar plantas`
      : `${credits.planName} · renova ${credits.monthlyCredits} por ${credits.creditRenewalPeriod === 'weekly' ? 'semana' : 'mês'}`;

  return (
    <Pressable
      onPress={() => router.push('/profile/plans')}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.icon}>
        <Coins size={Metrics.icon.large} color={Colors.white} strokeWidth={Metrics.icon.strokeWidth} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
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
    backgroundColor: `${Colors.primaryForeground}26`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primaryForeground,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.primaryForeground,
    opacity: 0.85,
    marginTop: 2,
  },
});
