import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { Colors, Metrics } from '@/theme';

type SectionTitleProps = {
  children: string;
  style?: StyleProp<TextStyle>;
};

export function SectionTitle({ children, style }: SectionTitleProps) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.mutedForeground,
    textTransform: 'uppercase',
    marginBottom: Metrics.spacing.sm,
  },
});
