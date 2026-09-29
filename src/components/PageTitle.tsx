import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { type ThemeColors, Typography, useThemedStyles } from '@/theme';

type PageTitleProps = {
  children: string;
  size?: 'display' | 'headline';
  style?: StyleProp<TextStyle>;
};

export function PageTitle({ children, size = 'display', style }: Readonly<PageTitleProps>) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Text style={[styles[size], style]} accessibilityRole="header">
      {children}
    </Text>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    display: {
      ...Typography.display,
      color: colors.foreground,
    },
    headline: {
      ...Typography.headline,
      color: colors.foreground,
    },
  });
