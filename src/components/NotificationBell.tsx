import { useMemo } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import Bell from 'lucide-react-native/icons/bell';
import { Metrics, useColors, type ThemeColors } from '@/theme';

type NotificationBellProps = {
  hasUnread?: boolean;
  size?: number;
  style?: ViewStyle;
};

export function NotificationBell({ hasUnread = false, size = Metrics.icon.normal, style }: Readonly<NotificationBellProps>) {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Pressable
      onPress={() => router.push('/profile/notifications')}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={hasUnread ? 'Notificações, você tem novidades' : 'Notificações'}
      style={({ pressed }) => [styles.container, { opacity: pressed ? 0.7 : 1 }, style]}
    >
      <Bell size={size} color={colors.leafForeground} strokeWidth={Metrics.icon.strokeWidth} />
      {hasUnread && <View style={styles.badge} />}
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    badge: {
      position: 'absolute',
      top: -2,
      right: -2,
      width: 10,
      height: 10,
      borderRadius: Metrics.radius.full,
      backgroundColor: colors.destructive,
      borderWidth: 1.5,
      borderColor: colors.leaf,
    },
  });
