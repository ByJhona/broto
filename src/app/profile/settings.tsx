import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import CreditCard from 'lucide-react-native/icons/credit-card';
import LogOut from 'lucide-react-native/icons/log-out';
import Monitor from 'lucide-react-native/icons/monitor';
import Moon from 'lucide-react-native/icons/moon';
import Sun from 'lucide-react-native/icons/sun';
import User from 'lucide-react-native/icons/user';
import { Metrics, useAppTheme, useColors, type ThemeColors, type ThemePreference } from '@/theme';
import { useLanguage, useTranslation, type Language } from '@/i18n';
import { Avatar, Card, PlanCard, SettingsListItem } from '@/components';
import { useAuth, useCredits } from '@/hooks';
import { manageSubscriptions, getProfile, type CreditsState } from '@/services';
import { Toast } from '@/utils';

function getPlanDescription(credits: CreditsState | null, t: (key: string, options?: Record<string, unknown>) => string): string {
  if (!credits) return t('loadingPlan');
  if (credits.monthlyCredits == null) return t('unlimitedCredits');
  if (credits.creditRenewalPeriod === 'weekly') return t('creditsPerWeek', { count: credits.monthlyCredits });
  return t('creditsPerMonth', { count: credits.monthlyCredits });
}

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'pt', label: 'Português' },
  { value: 'en', label: 'English' },
];

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation('settings');
  const { preference, setPreference } = useAppTheme();
  const { language, setLanguage } = useLanguage();
  const { session, user, signOut } = useAuth();
  const { credits } = useCredits();
  const { data: profile = null } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => getProfile(user!.id),
    enabled: !!user?.id,
  });

  const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: t('themeLight'), icon: Sun },
    { value: 'dark', label: t('themeDark'), icon: Moon },
    { value: 'system', label: t('themeSystem'), icon: Monitor },
  ];

  const name = profile?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  const currentPlan = {
    id: credits?.planId ?? 'free',
    name: credits?.planName ?? t('freePlanName'),
    description: getPlanDescription(credits, t),
  };

  const settingsItems = [{ icon: User, label: t('editProfile'), onPress: () => router.push('/profile/edit') }];

  const handleSignOut = async () => {
    await signOut();
  };

  const handleManageSubscription = async () => {
    try {
      await manageSubscriptions();
    } catch (err) {
      Toast.error(err instanceof Error ? err.message : t('manageSubscriptionFallback'));
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Metrics.spacing.xl }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.profileHeader}>
        <Avatar name={name} url={profile?.avatar_url} size={88} style={styles.avatar} />
        <Text style={styles.name}>{name}</Text>
        {profile?.username ? (
          <Text style={styles.username}>@{profile.username}</Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('myPlan')}</Text>
        <PlanCard
          plan={currentPlan}
          ctaLabel={t('seeAvailablePlans')}
          onPressCta={() => router.push('/profile/plans')}
        />
        {currentPlan.id !== 'free' ? (
          <Card style={[styles.list, styles.manageSubscriptionList]}>
            <SettingsListItem icon={CreditCard} label={t('manageSubscription')} onPress={handleManageSubscription} isLast />
          </Card>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('appearance')}</Text>
        <View style={styles.themeRow}>
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = preference === option.value;
            return (
              <Pressable
                key={option.value}
                style={[styles.themeOption, selected && styles.themeOptionSelected]}
                onPress={() => setPreference(option.value)}
              >
                <Icon
                  size={Metrics.icon.normal}
                  color={selected ? colors.primary : colors.mutedForeground}
                  strokeWidth={Metrics.icon.strokeWidth}
                />
                <Text style={[styles.themeOptionText, selected && styles.themeOptionTextSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('language')}</Text>
        <View style={styles.themeRow}>
          {LANGUAGE_OPTIONS.map((option) => {
            const selected = language === option.value;
            return (
              <Pressable
                key={option.value}
                style={[styles.themeOption, selected && styles.themeOptionSelected]}
                onPress={() => setLanguage(option.value)}
              >
                <Text style={[styles.themeOptionText, selected && styles.themeOptionTextSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings')}</Text>
        <Card style={styles.list}>
          {settingsItems.map((item, index) => (
            <SettingsListItem key={item.label} {...item} isLast={index === settingsItems.length - 1} />
          ))}
        </Card>
      </View>

      <Pressable style={styles.logoutButton} onPress={handleSignOut}>
        <LogOut size={Metrics.icon.normal} color={colors.destructive} strokeWidth={Metrics.icon.strokeWidth} />
        <Text style={styles.logoutText}>{t('signOut')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    ...Metrics.layout.centeredContent,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: Metrics.spacing.xl,
  },
  avatar: {
    marginBottom: Metrics.spacing.md,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.foreground,
  },
  username: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.leaf,
    marginTop: 4,
  },
  section: {
    paddingHorizontal: Metrics.spacing.lg,
    marginBottom: Metrics.spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    marginBottom: Metrics.spacing.sm,
  },
  list: {
    padding: 0,
    overflow: 'hidden',
  },
  manageSubscriptionList: {
    marginTop: Metrics.spacing.sm,
  },
  themeRow: {
    flexDirection: 'row',
    gap: Metrics.spacing.sm,
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    gap: Metrics.spacing.xs,
    backgroundColor: colors.card,
    borderRadius: Metrics.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: Metrics.spacing.md,
  },
  themeOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}14`,
  },
  themeOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  themeOptionTextSelected: {
    color: colors.primary,
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Metrics.spacing.sm,
    paddingVertical: Metrics.spacing.lg,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.destructive,
  },
  });
