import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import UserRound from 'lucide-react-native/icons/user-round';
import { Metrics, type ThemeColors, useThemedStyles } from '@/theme';
import { useTranslation } from '@/i18n';
import { EmptyState } from '@/components';
import { ProfileView } from '@/components/profile/ProfileView';
import { useAuth } from '@/hooks';

export default function ProfileTabScreen() {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation(['profile', 'common']);
  const { user } = useAuth();

  if (user?.id) return <ProfileView userId={user.id} showBack={false} />;

  return (
    <View style={styles.guest}>
      <EmptyState
        icon={UserRound}
        title={t('signInToSeeProfileTitle')}
        message={t('signInToSeeProfileMessage')}
        action={{ label: t('common:signIn'), onPress: () => router.push('/(auth)/login') }}
      />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    guest: {
      ...Metrics.layout.centeredContent,
      flex: 1,
      justifyContent: 'center',
      gap: Metrics.spacing.lg,
      padding: Metrics.spacing.xl,
      backgroundColor: colors.background,
    },
  });
