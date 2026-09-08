import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, LogOut, User } from 'lucide-react-native';
import { Colors, Metrics } from '@/theme';
import { Avatar, PlanCard, SettingsListItem } from '@/components';
import { useAuth, useCredits } from '@/hooks';
import { manageSubscriptions, getProfile } from '@/services';
import { Toast } from '@/utils';

export default function ProfileScreen() {
  const router = useRouter();
  const { session, user, signOut } = useAuth();
  const { credits } = useCredits();
  const { data: profile = null } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => getProfile(user!.id),
    enabled: !!user?.id,
  });

  const name = profile?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  const currentPlan = {
    id: credits?.planId ?? 'free',
    name: credits?.planName ?? 'Plano Gratuito',
    description: !credits
      ? 'Carregando...'
      : credits.monthlyCredits == null
        ? 'Créditos ilimitados'
        : `${credits.monthlyCredits} créditos por ${credits.creditRenewalPeriod === 'weekly' ? 'semana' : 'mês'}`,
  };

  const settingsItems = [{ icon: User, label: 'Editar perfil', onPress: () => router.push('/profile/edit') }];

  const handleSignOut = async () => {
    await signOut();
  };

  const handleManageSubscription = async () => {
    try {
      await manageSubscriptions();
    } catch (err) {
      Toast.error(err instanceof Error ? err.message : 'Tente gerenciar sua assinatura direto na loja do app.');
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.profileHeader}>
        <Avatar name={name} url={profile?.avatar_url} size={88} style={styles.avatar} />
        <Text style={styles.name}>{name}</Text>
        {profile?.username ? (
          <Text style={styles.username}>@{profile.username}</Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Meu plano</Text>
        <PlanCard
          plan={currentPlan}
          ctaLabel="Ver planos disponíveis"
          onPressCta={() => router.push('/profile/plans')}
        />
        {currentPlan.id !== 'free' ? (
          <View style={[styles.list, styles.manageSubscriptionList]}>
            <SettingsListItem icon={CreditCard} label="Gerenciar assinatura" onPress={handleManageSubscription} isLast />
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configurações</Text>
        <View style={styles.list}>
          {settingsItems.map((item, index) => (
            <SettingsListItem key={item.label} {...item} isLast={index === settingsItems.length - 1} />
          ))}
        </View>
      </View>

      <Pressable style={styles.logoutButton} onPress={handleSignOut}>
        <LogOut size={Metrics.icon.normal} color={Colors.destructive} strokeWidth={Metrics.icon.strokeWidth} />
        <Text style={styles.logoutText}>Sair da conta</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    color: Colors.foreground,
  },
  username: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.leaf,
    marginTop: 4,
  },
  section: {
    paddingHorizontal: Metrics.spacing.lg,
    marginBottom: Metrics.spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.mutedForeground,
    textTransform: 'uppercase',
    marginBottom: Metrics.spacing.sm,
  },
  list: {
    backgroundColor: Colors.white,
    borderRadius: Metrics.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  manageSubscriptionList: {
    marginTop: Metrics.spacing.sm,
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
    color: Colors.destructive,
  },
});
