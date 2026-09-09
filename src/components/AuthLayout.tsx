import { useMemo, type PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, type Href } from 'expo-router';
import Leaf from 'lucide-react-native/icons/leaf';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { OfflineBanner } from './OfflineBanner';

type AuthLayoutProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  isOffline: boolean;
  offlineMessage: string;
}>;

export function AuthLayout({ title, subtitle, isOffline, offlineMessage, children }: Readonly<AuthLayoutProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.logo}>
          <Leaf size={Metrics.icon.xl} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
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

export function AuthFooterLink({ href, label }: Readonly<AuthFooterLinkProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Link href={href} style={styles.link}>
      <Text style={styles.linkText}>{label}</Text>
    </Link>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.foreground,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
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
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  });
