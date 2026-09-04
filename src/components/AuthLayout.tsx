import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, type Href } from 'expo-router';
import { Leaf } from 'lucide-react-native';
import { Colors, Metrics } from '@/theme';
import { OfflineBanner } from './OfflineBanner';

type AuthLayoutProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  isOffline: boolean;
  offlineMessage: string;
}>;

export function AuthLayout({ title, subtitle, isOffline, offlineMessage, children }: AuthLayoutProps) {
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.logo}>
          <Leaf size={Metrics.icon.xl} color={Colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        {isOffline ? (
          <View style={styles.banner}>
            <OfflineBanner message={offlineMessage} />
          </View>
        ) : null}

        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type AuthFooterLinkProps = {
  href: Href;
  label: string;
};

export function AuthFooterLink({ href, label }: AuthFooterLinkProps) {
  return (
    <Link href={href} style={styles.link}>
      <Text style={styles.linkText}>{label}</Text>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Metrics.spacing.lg,
  },
  logo: {
    alignSelf: 'center',
    marginBottom: Metrics.spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.foreground,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: Metrics.spacing.xs,
    marginBottom: Metrics.spacing.xl,
  },
  banner: {
    marginBottom: Metrics.spacing.md,
    marginHorizontal: -Metrics.spacing.lg,
  },
  link: {
    marginTop: Metrics.spacing.lg,
    alignSelf: 'center',
  },
  linkText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
});
