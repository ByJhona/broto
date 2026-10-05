import { StyleSheet, Text, View } from 'react-native';
import MapPin from 'lucide-react-native/icons/map-pin';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { SkeletonBlock } from './Skeleton';

type DistancePillProps = {
  label: string | null;
};

export function DistancePill({ label }: Readonly<DistancePillProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.pill}>
      <MapPin size={Metrics.chip.sm.iconSize} color={colors.leaf} strokeWidth={Metrics.icon.stroke.regular} />
      {label ? (
        <Text style={styles.pillText} numberOfLines={1}>
          {label}
        </Text>
      ) : (
        <SkeletonBlock width={Metrics.size.sm} height={Metrics.fontSize.caption} radius={Metrics.radius.sm} />
      )}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.chip.sm.gap,
      backgroundColor: `${colors.leaf}1A`,
      borderRadius: Metrics.radius.full,
      paddingVertical: Metrics.chip.sm.paddingVertical,
      paddingHorizontal: Metrics.chip.sm.paddingHorizontal,
    },
    pillText: {
      ...Typography.captionStrong,
      color: colors.leaf,
    },
  });
