import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import UserRound from 'lucide-react-native/icons/user-round';
import { Metrics, useColors, type ThemeColors, useThemedStyles } from '@/theme';
import { useTranslation } from '@/i18n';
import { Avatar } from './Avatar';

const GUEST_ICON_RATIO = 0.55;

type ProfileIconProps = {
  name: string;
  url?: string | null;
  loggedIn?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function ProfileIcon({ name, url, loggedIn = true, size = Metrics.size.xl, style }: Readonly<ProfileIconProps>) {
  const router = useRouter();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('profile');

  const handlePress = () => router.navigate('/(tabs)/profile');

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={Metrics.hitSlop}
      accessibilityRole="button"
      accessibilityLabel={t('openProfile')}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      {loggedIn ? (
        <Avatar name={name} url={url} size={size} style={[styles.avatar, style]} />
      ) : (
        <View style={[styles.avatar, styles.guest, { width: size, height: size, borderRadius: size / 2 }, style]}>
          <UserRound size={size * GUEST_ICON_RATIO} color={colors.mutedForeground} strokeWidth={Metrics.icon.stroke.bold} />
        </View>
      )}
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    avatar: {
      borderWidth: Metrics.borderWidth.lg,
      borderColor: colors.leafForeground,
    },
    guest: {
      backgroundColor: colors.muted,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
