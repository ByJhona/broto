import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Sparkles from 'lucide-react-native/icons/sparkles';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';

type FeaturedBadgeProps = {
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
};

export function FeaturedBadge({ style, compact }: Readonly<FeaturedBadgeProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('common');

  if (compact) {
    return (
      <View style={[styles.badge, styles.badgeCompact, style]}>
        <Sparkles size={Metrics.chip.sm.iconSize} color={colors.white} strokeWidth={Metrics.icon.stroke.regular} />
      </View>
    );
  }

  return (
    <View style={[styles.badge, style]}>
      <Sparkles size={Metrics.chip.sm.iconSize} color={colors.white} strokeWidth={Metrics.icon.stroke.regular} />
      <Text style={styles.text}>{t('featuredBadge')}</Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.chip.sm.gap,
      backgroundColor: colors.primary,
      borderRadius: Metrics.radius.full,
      paddingVertical: Metrics.chip.sm.paddingVertical,
      paddingHorizontal: Metrics.chip.sm.paddingHorizontal,
    },
    badgeCompact: {
      padding: Metrics.spacing.xs,
    },
    text: {
      ...Typography.captionStrong,
      color: colors.white,
    },
  });
