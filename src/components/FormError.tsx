import { StyleSheet, Text } from 'react-native';
import { Colors, Metrics } from '@/theme';

type FormErrorProps = {
  children: string | null;
};

export function FormError({ children }: FormErrorProps) {
  if (!children) return null;

  return <Text style={styles.error}>{children}</Text>;
}

const styles = StyleSheet.create({
  error: {
    color: Colors.destructive,
    fontSize: 13,
    marginBottom: Metrics.spacing.md,
  },
});
