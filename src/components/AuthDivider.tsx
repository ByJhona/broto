import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Metrics, useColors, type ThemeColors } from '@/theme';

type AuthDividerProps = {
  label: string;
};

export function AuthDivider({ label }: Readonly<AuthDividerProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.line} />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: Metrics.spacing.lg,
      gap: Metrics.spacing.sm,
    },
    line: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    label: {
      fontSize: 13,
      color: colors.mutedForeground,
    },
  });
