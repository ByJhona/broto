import { useMemo } from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { Metrics, useColors, type ThemeColors } from '@/theme';

type SectionTitleProps = {
  children: string;
  style?: StyleProp<TextStyle>;
};

export function SectionTitle({ children, style }: Readonly<SectionTitleProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return <Text style={[styles.title, style]}>{children}</Text>;
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    title: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      marginBottom: Metrics.spacing.sm,
    },
  });
