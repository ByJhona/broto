import { useMemo } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import MapPin from 'lucide-react-native/icons/map-pin';
import { Elevation, Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { IconBadge } from '../IconBadge';

const OPEN_DRAG_DISTANCE = Metrics.spacing.lg;
const DRAG_START_DISTANCE = Metrics.spacing.sm;

type NearbyPeekProps = {
  label: string;
  onOpen: () => void;
  style?: StyleProp<ViewStyle>;
};

export function NearbyPeek({ label, onOpen, style }: Readonly<NearbyPeekProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_event, gesture) => gesture.dy < -DRAG_START_DISTANCE,
        onPanResponderRelease: (_event, gesture) => {
          if (gesture.dy < -OPEN_DRAG_DISTANCE) onOpen();
        },
      }),
    [onOpen]
  );

  return (
    <View style={[styles.container, style]} {...panResponder.panHandlers}>
      <Pressable style={styles.peek} onPress={onOpen} accessibilityRole="button">
        <IconBadge size={Metrics.size.sm} backgroundColor={`${colors.leaf}1F`}>
          <MapPin size={Metrics.icon.small} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
        </IconBadge>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <ChevronUp size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
      </Pressable>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      left: Metrics.spacing.lg,
      right: Metrics.spacing.lg + Metrics.size.xl + Metrics.spacing.md,
    },
    peek: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.sm,
      minHeight: Metrics.size.xl,
      paddingHorizontal: Metrics.spacing.md,
      borderRadius: Metrics.radius.full,
      backgroundColor: colors.card,
      ...Elevation.medium,
      shadowColor: colors.black,
    },
    label: {
      flex: 1,
      ...Typography.labelStrong,
      color: colors.foreground,
    },
  });
