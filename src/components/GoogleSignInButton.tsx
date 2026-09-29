import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { GoogleIcon } from './GoogleIcon';

type GoogleSignInButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export function GoogleSignInButton({ label, onPress, loading = false, disabled = false }: Readonly<GoogleSignInButtonProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
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
      borderRadius: Metrics.radius.full,
      paddingVertical: Metrics.spacing.md,
      marginTop: Metrics.spacing.sm,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    text: {
      color: colors.foreground,
      ...Typography.headingMedium,
    },
  });
