import { useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Sparkles from 'lucide-react-native/icons/sparkles';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { useTranslation } from '@/i18n';

type FeaturedBadgeProps = {
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
};

export function FeaturedBadge({ style, compact }: Readonly<FeaturedBadgeProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation('common');

  if (compact) {
    return (
      <View style={[styles.badge, styles.badgeCompact, style]}>
        <Sparkles size={11} color={colors.white} strokeWidth={Metrics.icon.strokeWidth} />
      </View>
    );
  }

  return (
    <View style={[styles.badge, style]}>
      <Sparkles size={11} color={colors.white} strokeWidth={Metrics.icon.strokeWidth} />
      <Text style={styles.text}>{t('featuredBadge')}</Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primary,
      borderRadius: Metrics.radius.full,
      paddingVertical: 4,
      paddingHorizontal: Metrics.spacing.sm,
    },
    badgeCompact: {
      padding: 4,
    },
    text: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.white,
    },
  });
