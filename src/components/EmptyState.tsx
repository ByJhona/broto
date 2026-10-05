import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';

type EmptyStateProps = {
  icon: LucideIcon;
  title?: string;
  message: string;
  style?: StyleProp<ViewStyle>;
};

export function EmptyState({ icon: Icon, title, message, style }: Readonly<EmptyStateProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.container, style]}>
      <Icon size={Metrics.icon.xl} color={colors.mutedForeground} strokeWidth={Metrics.icon.stroke.regular} />
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
    },
    title: {
      ...Typography.title,
      color: colors.foreground,
      marginTop: Metrics.spacing.md,
    },
    message: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
      textAlign: 'center',
      marginTop: Metrics.spacing.xs,
    },
  });
