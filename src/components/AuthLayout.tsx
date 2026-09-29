import { type PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link, type Href } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { BadgeMosaic } from './auth/BadgeMosaic';
import { BrotoLogo } from './BrotoLogo';
import { OfflineBanner } from './OfflineBanner';

type AuthLayoutProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  isOffline: boolean;
  offlineMessage: string;
  showMosaic?: boolean;
}>;

export function AuthLayout({
  title,
  subtitle,
  isOffline,
  offlineMessage,
  showMosaic = false,
  children,
}: Readonly<AuthLayoutProps>) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Metrics.spacing.lg }]}
      keyboardShouldPersistTaps="handled"
      bottomOffset={Metrics.spacing.lg}
    >
      {showMosaic ? <BadgeMosaic /> : null}

      <View style={styles.logo}>
        <BrotoLogo size={showMosaic ? 40 : 64} />
      </View>

      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {isOffline ? (
        <View style={styles.banner}>
          <OfflineBanner message={offlineMessage} />
        </View>
      ) : null}

      {children}
    </KeyboardAwareScrollView>
  );
}

type AuthFooterLinkProps = {
  href: Href;
  label: string;
};

export function AuthFooterLink({ href, label }: Readonly<AuthFooterLinkProps>) {
  const styles = useThemedStyles(makeStyles);
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
    ...Metrics.layout.centeredContent,
    flexGrow: 1,
    justifyContent: 'center',
    padding: Metrics.spacing.lg,
  },
  logo: {
    alignSelf: 'center',
    marginBottom: Metrics.spacing.lg,
  },
  title: {
    ...Typography.display,
    color: colors.foreground,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.bodySmall,
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
    ...Typography.label,
  },
  });
