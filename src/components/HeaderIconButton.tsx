import { Pressable, StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Metrics, Opacity, useColors, type ThemeColors, useThemedStyles } from '@/theme';

type HeaderIconButtonProps = {
  icon: LucideIcon;
  accessibilityLabel: string;
  hasUnread?: boolean;
  onPress: () => void;
};

export function HeaderIconButton({ icon: Icon, accessibilityLabel, hasUnread = false, onPress }: Readonly<HeaderIconButtonProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);

  return (
    <Pressable
      onPress={onPress}
      hitSlop={Metrics.hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <Icon size={Metrics.icon.normal} color={colors.leafForeground} strokeWidth={Metrics.icon.stroke.regular} />
      {hasUnread ? <View style={styles.badge} /> : null}
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    pressed: {
      opacity: Opacity.pressed,
    },
    badge: {
      position: 'absolute',
      top: -Metrics.spacing.xs,
      right: -Metrics.spacing.xs,
      width: Metrics.size.dot,
      height: Metrics.size.dot,
      borderRadius: Metrics.radius.full,
      backgroundColor: colors.primary,
      borderWidth: Metrics.borderWidth.md,
      borderColor: colors.leafForeground,
    },
  });
