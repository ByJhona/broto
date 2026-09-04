import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { Colors, Metrics } from '@/theme';

type SubmitButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export function SubmitButton({ label, onPress, loading = false, disabled = false }: SubmitButtonProps) {
  const isDisabled = loading || disabled;

  return (
    <Pressable
      style={[styles.button, isDisabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={Colors.primaryForeground} />
      ) : (
        <Text style={styles.text}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primary,
    borderRadius: Metrics.radius.md,
    paddingVertical: Metrics.spacing.md,
    alignItems: 'center',
    marginTop: Metrics.spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  text: {
    color: Colors.primaryForeground,
    fontWeight: '600',
    fontSize: 16,
  },
});
