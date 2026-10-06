import { StyleSheet, Text } from 'react-native';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';

type ScientificNameProps = {
  name: string;
  compact?: boolean;
};

export function ScientificName({ name, compact = false }: Readonly<ScientificNameProps>) {
  const styles = useThemedStyles(makeStyles);

  return (
    <Text style={compact ? styles.compact : styles.regular} numberOfLines={compact ? 1 : undefined}>
      {name}
    </Text>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    regular: {
      ...Typography.body,
      fontStyle: 'italic',
      color: colors.mutedForeground,
      marginTop: Metrics.spacing.xs,
    },
    compact: {
      ...Typography.bodySmall,
      fontStyle: 'italic',
      color: colors.mutedForeground,
    },
  });
