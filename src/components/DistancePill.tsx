import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapPin from 'lucide-react-native/icons/map-pin';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { SkeletonBlock } from './Skeleton';

type DistancePillProps = {
  label: string | null;
};

export function DistancePill({ label }: Readonly<DistancePillProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.pill}>
      <MapPin size={11} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
      {label ? (
        <Text style={styles.pillText} numberOfLines={1}>
          {label}
        </Text>
      ) : (
        <SkeletonBlock width={28} height={11} radius={Metrics.radius.sm} />
      )}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: `${colors.leaf}1A`,
      borderRadius: Metrics.radius.full,
      paddingVertical: 3,
      paddingHorizontal: 7,
    },
    pillText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.leaf,
    },
  });
