import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useQuery } from '@tanstack/react-query';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import CircleHelp from 'lucide-react-native/icons/circle-question-mark';
import CreditCard from 'lucide-react-native/icons/credit-card';
import Crown from 'lucide-react-native/icons/crown';
import Gift from 'lucide-react-native/icons/gift';
import LogOut from 'lucide-react-native/icons/log-out';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import TicketPercent from 'lucide-react-native/icons/ticket-percent';
import UserX from 'lucide-react-native/icons/user-x';
import { Metrics, useAppTheme, useColors, type ThemeColors, type ThemePreference, useThemedStyles, Typography } from '@/theme';
import { useLanguage, useTranslation, type Language } from '@/i18n';
import {
  Avatar,
  CardGroup,
  FloatingScreenControls,
  InfoSection,
  ListRow,
  PageTitle,
  SegmentedControl,
  SettingsListItem,
  useScreenTopInset,
} from '@/components';
import { useAuth, useCredits, useManageSubscription } from '@/hooks';
import { getProfile, type CreditsState } from '@/services';
import { confirm, Toast } from '@/utils';

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'pt', label: 'Português' },
  { value: 'en', label: 'English' },
];

function planDescription(credits: CreditsState | null, t: (key: string, options?: Record<string, unknown>) => string): string {
  if (!credits) return t('loadingPlan');
  if (credits.monthlyCredits == null) return t('unlimitedCredits');
  if (credits.creditRenewalPeriod === 'weekly') return t('creditsPerWeek', { count: credits.monthlyCredits });
  return t('creditsPerMonth', { count: credits.monthlyCredits });
}

function appVersionLabel(): string | null {
  const version = Constants.expoConfig?.version;
  const build = Constants.expoConfig?.android?.versionCode;
  if (!version) return null;
  return build ? `${version} (${build})` : version;
}

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = useScreenTopInset();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation(['settings', 'privacy']);
  const { preference, setPreference } = useAppTheme();
  const { language, setLanguage } = useLanguage();
  const { session, user, signOut } = useAuth();
  const { credits } = useCredits();
  const handleManageSubscription = useManageSubscription();
  const { data: profile = null } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => getProfile(user!.id),
    enabled: !!user?.id,
  });

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  const name = profile?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
  const accountSubtitle = profile?.username ? `@${profile.username}` : (user?.email ?? undefined);
  const isPaidPlan = !!credits && credits.planId !== 'free';
  const version = appVersionLabel();

  const themeOptions: { value: ThemePreference; label: string }[] = [
    { value: 'light', label: t('themeLight') },
    { value: 'dark', label: t('themeDark') },
    { value: 'system', label: t('themeSystem') },
  ];

  const handleSignOut = async () => {
    const confirmed = await confirm(t('signOutConfirmTitle'), t('signOutConfirmMessage'), {
      confirmLabel: t('signOut'),
      destructive: true,
    });
    if (confirmed) await signOut();
  };

  const handleDeleteAccount = async () => {
    const confirmed = await confirm(t('deleteAccountTitle'), t('deleteAccountMessage'), {
      confirmLabel: t('deleteAccountContact'),
    });
    if (!confirmed) return;
    const email = t('privacy:contactEmail');
    const subject = encodeURIComponent(t('deleteAccountEmailSubject'));
    try {
      await Linking.openURL(`mailto:${email}?subject=${subject}`);
    } catch (err) {
      console.error(err);
      Toast.info(t('deleteAccountEmailFallback', { email }));
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topInset,
            paddingBottom: insets.bottom + Metrics.spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <PageTitle style={styles.title}>{t('settings')}</PageTitle>

        <CardGroup style={styles.account}>
          <ListRow
            style={styles.accountRow}
            leading={<Avatar name={name} url={profile?.avatar_url} size={Metrics.size.lg} />}
            eyebrow={t('editProfile')}
            title={name}
            subtitle={accountSubtitle}
            trailing={<ChevronRight size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.stroke.regular} />}
            onPress={() => router.push('/profile/edit')}
          />
        </CardGroup>

        <InfoSection title={t('myPlan')}>
          <CardGroup>
            <SettingsListItem
              icon={isPaidPlan ? Crown : Gift}
              label={credits?.planName ?? t('freePlanName')}
              subtitle={planDescription(credits, t)}
              onPress={() => router.push('/profile/plans')}
            />
            {isPaidPlan ? (
              <SettingsListItem icon={CreditCard} label={t('manageSubscription')} onPress={handleManageSubscription} />
            ) : null}
            <SettingsListItem icon={TicketPercent} label={t('redeemCode')} onPress={() => router.push('/profile/redeem-code')} />
          </CardGroup>
        </InfoSection>

        <InfoSection title={t('appearance')}>
          <SegmentedControl options={themeOptions} value={preference} onChange={setPreference} />
        </InfoSection>

        <InfoSection title={t('language')}>
          <SegmentedControl options={LANGUAGE_OPTIONS} value={language} onChange={setLanguage} />
        </InfoSection>

        <InfoSection title={t('support')}>
          <CardGroup>
            <SettingsListItem icon={ShieldCheck} label={t('privacyAndSecurity')} onPress={() => router.push('/privacy')} />
            <SettingsListItem icon={CircleHelp} label={t('help')} onPress={() => router.push('/profile/help')} />
          </CardGroup>
        </InfoSection>

        <CardGroup>
          <SettingsListItem icon={LogOut} label={t('signOut')} destructive onPress={handleSignOut} />
          <SettingsListItem icon={UserX} label={t('deleteAccount')} destructive onPress={handleDeleteAccount} />
        </CardGroup>

        {version ? <Text style={styles.version}>{t('appVersion', { version })}</Text> : null}
      </ScrollView>
      <FloatingScreenControls />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      ...Metrics.layout.centeredContent,
      paddingHorizontal: Metrics.spacing.lg,
    },
    title: {
      marginBottom: Metrics.spacing.lg,
    },
    account: {
      marginBottom: Metrics.spacing.xl,
    },
    accountRow: {
      paddingVertical: Metrics.spacing.md,
    },
    version: {
      ...Typography.caption,
      color: colors.mutedForeground,
      textAlign: 'center',
      marginTop: Metrics.spacing.lg,
    },
  });
