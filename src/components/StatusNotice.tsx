import { StyleSheet, Text } from 'react-native';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';

type StatusNoticeProps = {
  text: string | null;
  muted?: boolean;
};

export function StatusNotice({ text, muted = false }: Readonly<StatusNoticeProps>) {
  const styles = useThemedStyles(makeStyles);

  if (!text) return null;
  return <Text style={muted ? styles.noticeMuted : styles.notice}>{text}</Text>;
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    notice: {
      ...Typography.label,
      color: colors.destructive,
      marginBottom: Metrics.spacing.lg,
    },
    noticeMuted: {
      ...Typography.label,
      color: colors.mutedForeground,
      marginBottom: Metrics.spacing.lg,
    },
  });
