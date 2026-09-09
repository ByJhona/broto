import { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Metrics, useColors, type ThemeColors } from '@/theme';

type FormErrorProps = {
  children: string | null;
};

export function FormError({ children }: Readonly<FormErrorProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (!children) return null;

  return <Text style={styles.error}>{children}</Text>;
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    error: {
      color: colors.destructive,
      fontSize: 13,
      marginBottom: Metrics.spacing.md,
    },
  });
