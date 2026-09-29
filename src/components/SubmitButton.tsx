import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';

type SubmitButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export function SubmitButton({ label, onPress, loading = false, disabled = false }: Readonly<SubmitButtonProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
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
      borderRadius: Metrics.radius.full,
      paddingVertical: Metrics.spacing.md,
      alignItems: 'center',
      marginTop: Metrics.spacing.sm,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    text: {
      color: colors.primaryForeground,
      ...Typography.headingMedium,
    },
  });
