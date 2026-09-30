import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Camera from 'lucide-react-native/icons/camera';
import Coins from 'lucide-react-native/icons/coins';
import Crown from 'lucide-react-native/icons/crown';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { useCreditCosts, useCredits } from '@/hooks';
import { creditsBalanceLabel, creditsNudge, CREDITS_NUDGE_ACTION } from '@/utils';
import { IconBadge } from './IconBadge';

export function CreditsBar() {
  const router = useRouter();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('credits');
  const { credits } = useCredits();
  const costs = useCreditCosts();

  if (!credits) return null;

  const nudge = creditsNudge(credits, costs.identification);
  const isIdentify = nudge.action === CREDITS_NUDGE_ACTION.IDENTIFY;
  const ActionIcon = isIdentify ? Camera : Crown;
  const openPlans = () => router.push('/profile/plans');
  const handleAction = isIdentify ? () => router.push('/(tabs)/identify') : openPlans;

  return (
    <View style={styles.bar}>
      <Pressable style={styles.balance} onPress={openPlans} accessibilityRole="button">
        <IconBadge size={Metrics.size.md} backgroundColor={`${colors.leafForeground}26`}>
          <Coins size={Metrics.icon.normal} color={colors.leafForeground} strokeWidth={Metrics.icon.strokeWidth} />
        </IconBadge>
        <View style={styles.text}>
          <Text style={styles.title}>{creditsBalanceLabel(credits)}</Text>
          <Text style={styles.message} numberOfLines={1}>
            {nudge.message}
          </Text>
        </View>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        onPress={handleAction}
        accessibilityRole="button"
      >
        <ActionIcon size={Metrics.icon.small} color={colors.primaryForeground} strokeWidth={Metrics.icon.strokeWidth} />
        <Text style={styles.actionText}>{isIdentify ? t('identifyAction') : t('seePlansAction')}</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.sm,
      padding: Metrics.spacing.sm,
      borderRadius: Metrics.radius.lg,
      backgroundColor: `${colors.leafForeground}1A`,
    },
    balance: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.sm,
    },
    text: {
      flex: 1,
    },
    title: {
      ...Typography.heading,
      color: colors.leafForeground,
    },
    message: {
      ...Typography.caption,
      color: colors.leafForeground,
      opacity: 0.85,
    },
    action: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.xs,
      backgroundColor: colors.primary,
      borderRadius: Metrics.radius.full,
      paddingVertical: Metrics.spacing.sm,
      paddingHorizontal: Metrics.spacing.md,
    },
    pressed: {
      opacity: 0.8,
    },
    actionText: {
      ...Typography.labelStrong,
      color: colors.primaryForeground,
    },
  });
