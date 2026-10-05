import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Lock from 'lucide-react-native/icons/lock';
import Sparkles from 'lucide-react-native/icons/sparkles';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';

type LockedFeatureCardProps = {
  message: string;
  ctaLabel?: string;
};

export function LockedFeatureCard({ message, ctaLabel }: Readonly<LockedFeatureCardProps>) {
  const router = useRouter();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('common');
  const resolvedCtaLabel = ctaLabel ?? t('unlockWithPremium');

  return (
    <View style={styles.card}>
      <View style={styles.icon}>
        <Lock size={Metrics.icon.normal} color={colors.mutedForeground} strokeWidth={Metrics.icon.stroke.regular} />
      </View>
      <Text style={styles.text}>{message}</Text>
      <Pressable style={styles.button} onPress={() => router.push('/profile/plans')}>
        <Sparkles size={Metrics.icon.xs} color={colors.primaryForeground} strokeWidth={Metrics.icon.stroke.bold} />
        <Text style={styles.buttonText}>{resolvedCtaLabel}</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      alignItems: 'center',
      backgroundColor: colors.muted,
      borderRadius: Metrics.radius.lg,
      padding: Metrics.spacing.lg,
      gap: Metrics.spacing.sm,
    },
    icon: {
      width: Metrics.size.lg,
      height: Metrics.size.lg,
      borderRadius: Metrics.radius.full,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
    },
    text: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.sm,
      backgroundColor: colors.primary,
      borderRadius: Metrics.radius.full,
      paddingVertical: Metrics.spacing.sm,
      paddingHorizontal: Metrics.spacing.md,
      marginTop: Metrics.spacing.xs,
    },
    buttonText: {
      ...Typography.labelStrong,
      color: colors.primaryForeground,
    },
  });
