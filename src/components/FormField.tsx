import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import Eye from 'lucide-react-native/icons/eye';
import EyeOff from 'lucide-react-native/icons/eye-off';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';

type FormFieldProps = TextInputProps & {
  label: string;
  error?: string | null;
};

export function FormField({ label, error, style, secureTextEntry, ...inputProps }: Readonly<FormFieldProps>) {
  const colors = useColors();
  const { t } = useTranslation();
  const styles = useThemedStyles(makeStyles);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPasswordField = !!secureTextEntry;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, isPasswordField && styles.inputWithToggle, !!error && styles.inputError, style]}
          accessibilityLabel={label}
          accessibilityHint={error ?? undefined}
          secureTextEntry={isPasswordField && !isPasswordVisible}
          {...inputProps}
        />
        {isPasswordField ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isPasswordVisible ? t('common:a11yHidePassword') : t('common:a11yShowPassword')}
            style={styles.toggleButton}
            onPress={() => setIsPasswordVisible((current) => !current)}
            hitSlop={8}
          >
            {isPasswordVisible ? (
              <EyeOff size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
            ) : (
              <Eye size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
            )}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      marginBottom: Metrics.spacing.md,
    },
    label: {
      ...Typography.label,
      color: colors.foreground,
      marginBottom: Metrics.spacing.xs,
    },
    inputWrapper: {
      justifyContent: 'center',
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Metrics.radius.md,
      paddingHorizontal: Metrics.spacing.md,
      paddingVertical: Metrics.spacing.sm,
      ...Typography.input,
      color: colors.foreground,
      backgroundColor: colors.card,
    },
    inputWithToggle: {
      paddingRight: Metrics.spacing.xl + Metrics.spacing.xs,
    },
    inputError: {
      borderColor: colors.destructive,
    },
    error: {
      ...Typography.caption,
      color: colors.destructive,
      marginTop: Metrics.spacing.xs,
    },
    toggleButton: {
      position: 'absolute',
      right: Metrics.spacing.sm,
      padding: Metrics.spacing.xs,
    },
  });
