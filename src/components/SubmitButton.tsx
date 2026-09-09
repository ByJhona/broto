import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { Metrics, useColors, type ThemeColors } from '@/theme';

type SubmitButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export function SubmitButton({ label, onPress, loading = false, disabled = false }: Readonly<SubmitButtonProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isDisabled = loading || disabled;

  return (
    <Pressable
      style={[styles.button, isDisabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={colors.primaryForeground} />
      ) : (
        <Text style={styles.text}>{label}</Text>
      )}
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    button: {
      backgroundColor: colors.primary,
      borderRadius: Metrics.radius.md,
      paddingVertical: Metrics.spacing.md,
      alignItems: 'center',
      marginTop: Metrics.spacing.sm,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    text: {
      color: colors.primaryForeground,
      fontWeight: '600',
      fontSize: 16,
    },
  });
