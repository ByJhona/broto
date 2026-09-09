import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import Eye from 'lucide-react-native/icons/eye';
import EyeOff from 'lucide-react-native/icons/eye-off';
import { Colors, Metrics } from '@/theme';

type FormFieldProps = TextInputProps & {
  label: string;
};

export function FormField({ label, style, secureTextEntry, ...inputProps }: FormFieldProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPasswordField = !!secureTextEntry;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          placeholderTextColor={Colors.mutedForeground}
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
              <EyeOff size={18} color={Colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
            ) : (
              <Eye size={18} color={Colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Metrics.spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: Metrics.spacing.xs,
  },
  inputWrapper: {
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Metrics.radius.md,
    paddingHorizontal: Metrics.spacing.md,
    paddingVertical: Metrics.spacing.sm,
    fontSize: 15,
    color: Colors.foreground,
    backgroundColor: Colors.white,
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
