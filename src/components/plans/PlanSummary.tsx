import { StyleSheet, Text, View } from 'react-native';
import Coins from 'lucide-react-native/icons/coins';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import type { CreditsState } from '@/services';
import { creditsBalanceTitle, creditsRenewalSubtitle } from '@/utils';
import { IconBadge } from '../IconBadge';

export function PlanSummary({ credits }: Readonly<{ credits: CreditsState | null }>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.summary}>
      <IconBadge size={Metrics.size.lg} backgroundColor={colors.leaf}>
        <Coins size={Metrics.icon.normal} color={colors.leafForeground} strokeWidth={Metrics.icon.strokeWidth} />
      </IconBadge>
      <View style={styles.text}>
        <Text style={styles.title}>{creditsBalanceTitle(credits)}</Text>
        <Text style={styles.subtitle}>{creditsRenewalSubtitle(credits)}</Text>
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    summary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.md,
      padding: Metrics.spacing.md,
      borderRadius: Metrics.radius.lg,
      backgroundColor: `${colors.leaf}14`,
    },
    text: {
      flex: 1,
      gap: Metrics.spacing.xs,
    },
    title: {
      ...Typography.heading,
      color: colors.foreground,
    },
    subtitle: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
    },
  });
