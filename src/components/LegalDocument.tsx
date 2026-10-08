import type { ReactNode } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { Toast } from '@/utils';
import { ScreenHeader } from './ScreenHeader';

type LegalSection = { title: string; body: string };

type LegalDocumentProps = {
  namespace: 'privacy' | 'terms';
  title: string;
  topInset: number;
  bottomInset: number;
  lead?: string;
};

export function LegalDocument({ namespace, title, topInset, bottomInset, lead }: Readonly<LegalDocumentProps>) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation(namespace);
  const sections = t('sections', { returnObjects: true }) as LegalSection[];
  const contactEmail = t('contactEmail');

  const handleContact = async () => {
    try {
      await Linking.openURL(`mailto:${contactEmail}`);
    } catch (err) {
      console.error(err);
      Toast.info(contactEmail);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: topInset, paddingBottom: bottomInset }]}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader title={title} subtitle={t('lastUpdated')} />
      {lead ? <Text style={styles.lead}>{lead}</Text> : null}
      <Text style={styles.intro}>{t('intro')}</Text>

      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionBody}>{section.body}</Text>
        </View>
      ))}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('contactTitle')}</Text>
        <Text style={styles.sectionBody}>{t('contactBody')}</Text>
        <Pressable onPress={handleContact} accessibilityRole="link">
          <Text style={styles.contactEmail}>{contactEmail}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

export function LegalDocumentFooter({ children }: Readonly<{ children: ReactNode }>) {
  const styles = useThemedStyles(makeStyles);
  return <View style={styles.footer}>{children}</View>;
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    content: {
      ...Metrics.layout.centeredContent,
      paddingHorizontal: Metrics.spacing.lg,
    },
    lead: {
      ...Typography.heading,
      color: colors.foreground,
      marginBottom: Metrics.spacing.md,
    },
    intro: {
      ...Typography.body,
      color: colors.foreground,
      marginBottom: Metrics.spacing.lg,
    },
    section: {
      marginBottom: Metrics.spacing.lg,
    },
    sectionTitle: {
      ...Typography.heading,
      color: colors.foreground,
      marginBottom: Metrics.spacing.xs,
    },
    sectionBody: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
    },
    contactEmail: {
      ...Typography.label,
      color: colors.leaf,
      marginTop: Metrics.spacing.xs,
    },
    footer: {
      ...Metrics.layout.centeredContent,
      paddingHorizontal: Metrics.spacing.lg,
      paddingTop: Metrics.spacing.md,
      borderTopWidth: Metrics.borderWidth.sm,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
  });
