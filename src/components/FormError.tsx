import { StyleSheet, Text } from 'react-native';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';

type FormErrorProps = {
  children: string | null;
};

export function FormError({ children }: Readonly<FormErrorProps>) {
  const styles = useThemedStyles(makeStyles);

  if (!children) return null;

  return <Text style={styles.error}>{children}</Text>;
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    error: {
      color: colors.destructive,
      ...Typography.bodySmall,
      marginBottom: Metrics.spacing.md,
    },
  });
