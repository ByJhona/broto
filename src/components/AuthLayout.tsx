import { type PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { BrandLogo } from './BrandLogo';
import { FloatingScreenControls } from './FloatingScreenControls';
import { OfflineBanner } from './OfflineBanner';
import { TextButton } from './TextButton';

type AuthFooterLink = {
  label: string;
  href: Href;
};

type AuthLayoutProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  isOffline: boolean;
  offlineMessage: string;
  footerLink?: AuthFooterLink;
  showLegalNotice?: boolean;
  backHref?: Href;
}>;

export function AuthLayout({
  title,
  subtitle,
  isOffline,
  offlineMessage,
  footerLink,
  showLegalNotice = false,
  backHref,
  children,
}: Readonly<AuthLayoutProps>) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('auth');

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Metrics.spacing.lg, paddingBottom: insets.bottom + Metrics.spacing.lg },
        ]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={Metrics.spacing.lg}
      >
        <View style={styles.logo}>
          <BrandLogo height={Metrics.size.xl} />
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

        {footerLink ? (
          <TextButton
            label={footerLink.label}
            tone="primary"
            accessibilityRole="link"
            onPress={() => router.replace(footerLink.href)}
            style={styles.footerLink}
          />
        ) : null}

        {showLegalNotice ? (
          <Text style={styles.legal}>
            {t('legalNotice')}{' '}
            <Text style={styles.legalLink} accessibilityRole="link" onPress={() => router.push('/privacy')}>
              {t('privacyPolicyLink')}
            </Text>
          </Text>
        ) : null}
      </KeyboardAwareScrollView>
      {backHref ? <FloatingScreenControls onBack={() => router.dismissTo(backHref)} /> : null}
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
    footerLink: {
      marginTop: Metrics.spacing.lg,
    },
    legal: {
      ...Typography.caption,
      color: colors.mutedForeground,
      textAlign: 'center',
      marginTop: Metrics.spacing.lg,
    },
    legalLink: {
      ...Typography.captionStrong,
      color: colors.primary,
    },
  });
