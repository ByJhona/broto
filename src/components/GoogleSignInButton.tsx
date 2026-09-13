import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { GoogleIcon } from './GoogleIcon';

type GoogleSignInButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export function GoogleSignInButton({ label, onPress, loading = false, disabled = false }: Readonly<GoogleSignInButtonProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isDisabled = loading || disabled;

  return (
    <Pressable style={[styles.button, isDisabled && styles.buttonDisabled]} onPress={onPress} disabled={isDisabled}>
      {loading ? (
        <ActivityIndicator color={colors.foreground} />
      ) : (
        <>
          <GoogleIcon />
          <Text style={styles.text}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Metrics.spacing.sm,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Metrics.radius.md,
      paddingVertical: Metrics.spacing.md,
      marginTop: Metrics.spacing.sm,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    text: {
      color: colors.foreground,
      fontWeight: '600',
      fontSize: 16,
    },
  });
