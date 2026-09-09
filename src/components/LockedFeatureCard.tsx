import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Lock from 'lucide-react-native/icons/lock';
import Sparkles from 'lucide-react-native/icons/sparkles';
import { Colors, Metrics } from '@/theme';

type LockedFeatureCardProps = {
  message: string;
  ctaLabel?: string;
};

export function LockedFeatureCard({ message, ctaLabel = 'Desbloquear com Premium' }: LockedFeatureCardProps) {
  const router = useRouter();

  return (
    <View style={styles.card}>
      <View style={styles.icon}>
        <Lock size={Metrics.icon.normal} color={Colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
      </View>
      <Text style={styles.text}>{message}</Text>
      <Pressable style={styles.button} onPress={() => router.push('/profile/plans')}>
        <Sparkles size={14} color={Colors.primaryForeground} strokeWidth={2} />
        <Text style={styles.buttonText}>{ctaLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: Colors.muted,
    borderRadius: Metrics.radius.lg,
    padding: Metrics.spacing.lg,
    gap: Metrics.spacing.sm,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: Metrics.radius.full,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 13,
    color: Colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 18,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: Metrics.radius.full,
    paddingVertical: Metrics.spacing.sm,
    paddingHorizontal: Metrics.spacing.md,
    marginTop: Metrics.spacing.xs,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryForeground,
  },
});
