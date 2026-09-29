import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';

type SectionTitleProps = {
  children: string;
  style?: StyleProp<TextStyle>;
};

export function SectionTitle({ children, style }: Readonly<SectionTitleProps>) {
  const styles = useThemedStyles(makeStyles);
  return <Text style={[styles.title, style]}>{children}</Text>;
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    title: {
      ...Typography.heading,
      color: colors.foreground,
      marginBottom: Metrics.spacing.sm,
    },
  });
