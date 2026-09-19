import { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Metrics, useColors, type ThemeColors } from '@/theme';

type StatusNoticeProps = {
  text: string | null;
  muted?: boolean;
};

export function StatusNotice({ text, muted = false }: Readonly<StatusNoticeProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (!text) return null;
  return <Text style={muted ? styles.noticeMuted : styles.notice}>{text}</Text>;
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    notice: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.destructive,
      marginBottom: Metrics.spacing.lg,
    },
    noticeMuted: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.mutedForeground,
      marginBottom: Metrics.spacing.lg,
    },
  });
