import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { PageTitle } from './PageTitle';

export const FLOATING_CONTROLS_CLEARANCE = Metrics.size.md + Metrics.spacing.lg;

export function useScreenTopInset(): number {
  const insets = useSafeAreaInsets();
  return insets.top + FLOATING_CONTROLS_CLEARANCE;
}

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function ScreenHeader({ title, subtitle, trailing, style }: Readonly<ScreenHeaderProps>) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={[styles.header, style]}>
      <View style={styles.titleRow}>
        <PageTitle style={styles.title}>{title}</PageTitle>
        {trailing}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    header: {
      gap: Metrics.spacing.xs,
      marginBottom: Metrics.spacing.lg,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.md,
    },
    title: {
      flex: 1,
    },
    subtitle: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
    },
  });
