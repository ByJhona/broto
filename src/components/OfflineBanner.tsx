import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import WifiOff from 'lucide-react-native/icons/wifi-off';
import { Metrics, useColors, type ThemeColors } from '@/theme';

type OfflineBannerProps = {
  message?: string;
};

export function OfflineBanner({ message = 'Sem conexão — mostrando dados salvos.' }: Readonly<OfflineBannerProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <WifiOff size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.xs,
      backgroundColor: colors.muted,
      borderRadius: Metrics.radius.md,
      paddingVertical: Metrics.spacing.sm,
      paddingHorizontal: Metrics.spacing.md,
      marginHorizontal: Metrics.spacing.lg,
    },
    text: {
      flex: 1,
      fontSize: 13,
      color: colors.mutedForeground,
    },
  });
