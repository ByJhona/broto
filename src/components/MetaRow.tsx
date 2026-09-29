import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Metrics, type ThemeColors, Typography, useColors, useThemedStyles } from '@/theme';

export type MetaTone = 'muted' | 'leaf' | 'alert';

type MetaRowProps = {
  icon: LucideIcon;
  label: string;
  tone?: MetaTone;
  iconColor?: string;
  size?: 'small' | 'caption';
  numberOfLines?: number;
  style?: StyleProp<ViewStyle>;
};

function toneColor(tone: MetaTone, colors: ThemeColors): string {
  if (tone === 'alert') return colors.destructive;
  if (tone === 'leaf') return colors.leaf;
  return colors.mutedForeground;
}

export function MetaRow({
  icon: Icon,
  label,
  tone = 'muted',
  iconColor,
  size = 'small',
  numberOfLines = 1,
  style,
}: Readonly<MetaRowProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const isCaption = size === 'caption';

  return (
    <View style={[styles.row, style]}>
      <Icon
        size={isCaption ? Metrics.icon.xs : Metrics.icon.small}
        color={iconColor ?? toneColor(tone, colors)}
        strokeWidth={Metrics.icon.strokeWidth}
      />
      <Text style={[isCaption ? styles.caption : styles.small, styles[tone]]} numberOfLines={numberOfLines}>
        {label}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.xs,
    },
    small: {
      flexShrink: 1,
      ...Typography.bodySmall,
    },
    caption: {
      flexShrink: 1,
      ...Typography.caption,
    },
    muted: {
      color: colors.mutedForeground,
    },
    leaf: {
      fontFamily: Typography.label.fontFamily,
      fontWeight: Typography.label.fontWeight,
      color: colors.leaf,
    },
    alert: {
      fontFamily: Typography.label.fontFamily,
      fontWeight: Typography.label.fontWeight,
      color: colors.destructive,
    },
  });
