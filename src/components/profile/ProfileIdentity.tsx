import { StyleSheet, Text, View } from 'react-native';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import type { UserProfile } from '@/types';
import { formatMonthYear } from '@/utils';
import { Avatar } from '../Avatar';
import { PageTitle } from '../PageTitle';

type ProfileIdentityProps = {
  name: string;
  profile: UserProfile | null;
};

export function ProfileIdentity({ name, profile }: Readonly<ProfileIdentityProps>) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('profile');

  return (
    <View style={styles.identity}>
      <Avatar name={name} url={profile?.avatar_url} size={Metrics.size.hero} />
      <PageTitle size="headline" style={styles.name}>
        {name}
      </PageTitle>
      {profile?.username ? <Text style={styles.username}>@{profile.username}</Text> : null}
      {profile?.created_at ? (
        <Text style={styles.since}>{t('memberSince', { date: formatMonthYear(profile.created_at) })}</Text>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    identity: {
      alignItems: 'center',
      gap: Metrics.spacing.xs,
    },
    name: {
      marginTop: Metrics.spacing.sm,
      textAlign: 'center',
    },
    username: {
      ...Typography.label,
      color: colors.leaf,
    },
    since: {
      ...Typography.caption,
      color: colors.mutedForeground,
    },
  });
