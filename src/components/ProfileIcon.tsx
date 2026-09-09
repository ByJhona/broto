import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import UserRound from 'lucide-react-native/icons/user-round';
import { Colors } from '@/theme';
import { Avatar } from './Avatar';

type ProfileIconProps = {
  name: string;
  url?: string | null;
  loggedIn?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function ProfileIcon({ name, url, loggedIn = true, size = 52, style }: ProfileIconProps) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push('/profile')}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Abrir perfil"
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      {loggedIn ? (
        <Avatar name={name} url={url} size={size} style={[styles.avatar, style]} />
      ) : (
        <View style={[styles.avatar, styles.guest, { width: size, height: size, borderRadius: size / 2 }, style]}>
          <UserRound size={size * 0.55} color={Colors.mutedForeground} strokeWidth={2} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderWidth: 2,
    borderColor: Colors.leafForeground,
  },
  guest: {
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
