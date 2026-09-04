import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Colors, Metrics } from '@/theme';

type FormFieldProps = TextInputProps & {
  label: string;
};

export function FormField({ label, style, ...inputProps }: FormFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={Colors.mutedForeground}
        style={[styles.input, style]}
        {...inputProps}
      />
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
});
