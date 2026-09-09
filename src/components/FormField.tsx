import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import Eye from 'lucide-react-native/icons/eye';
import EyeOff from 'lucide-react-native/icons/eye-off';
import { Metrics, useColors, type ThemeColors } from '@/theme';

type FormFieldProps = TextInputProps & {
  label: string;
};

export function FormField({ label, style, secureTextEntry, ...inputProps }: Readonly<FormFieldProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPasswordField = !!secureTextEntry;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, isPasswordField && styles.inputWithToggle, style]}
          secureTextEntry={isPasswordField && !isPasswordVisible}
          {...inputProps}
        />
        {isPasswordField ? (
          <Pressable
            style={styles.toggleButton}
            onPress={() => setIsPasswordVisible((current) => !current)}
            hitSlop={8}
          >
            {isPasswordVisible ? (
              <EyeOff size={18} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
            ) : (
              <Eye size={18} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      marginBottom: Metrics.spacing.md,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
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
      fontSize: 15,
      color: colors.foreground,
      backgroundColor: colors.card,
    },
    inputWithToggle: {
      paddingRight: Metrics.spacing.xl + Metrics.spacing.xs,
    },
    toggleButton: {
      position: 'absolute',
      right: Metrics.spacing.sm,
      padding: 4,
    },
  });
